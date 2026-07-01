import { FunctionCallingMode, GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { LlmClient } from '../domain/ports';
import type { Group, Incident, Severity } from '../domain/types';
import { AiUnavailableError, ParseFailedError } from '../domain/errors';

const CREATE_INCIDENT_DRAFT_FN = 'create_incident_draft';

const SEVERITIES: Severity[] = ['Critical', 'High', 'Medium', 'Low'];

function logAiCall(op: string, ok: boolean, durationMs: number): void {
  const log = ok ? console.log : console.error;
  log(JSON.stringify({ event: 'llm_call', op, ok, durationMs }));
}

export class GeminiLlmClient implements LlmClient {
  private readonly client: GoogleGenerativeAI;

  constructor(
    apiKey: string,
    private readonly modelName: string = 'gemini-2.5-flash'
  ) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async suggestSeverityAndRouting(
    description: string,
    groups: Group[]
  ): Promise<{ severity: Severity; targetGroupId: string }> {
    const start = Date.now();
    try {
      const model = this.client.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              severity: { type: SchemaType.STRING, enum: SEVERITIES },
              targetGroupId: { type: SchemaType.STRING, enum: groups.map((g) => g.groupId) },
            },
            required: ['severity', 'targetGroupId'],
          },
        },
      });

      const groupList = groups.map((g) => `- ${g.groupId} | ${g.name}: ${g.description}`).join('\n');
      const prompt = [
        'You are triaging an incident for an insurtech platform.',
        'Based on the incident description, choose the most appropriate severity and the group best suited to own it, matching the description against each group\'s domain scope.',
        '',
        `Incident description: ${description}`,
        '',
        'Available groups (id | name: domain scope):',
        groupList,
      ].join('\n');

      const result = await model.generateContent(prompt);
      const parsed = JSON.parse(result.response.text()) as { severity: string; targetGroupId: string };

      if (
        !SEVERITIES.includes(parsed.severity as Severity) ||
        !groups.some((g) => g.groupId === parsed.targetGroupId)
      ) {
        throw new Error('Model returned an out-of-range suggestion');
      }

      logAiCall('suggest', true, Date.now() - start);
      return { severity: parsed.severity as Severity, targetGroupId: parsed.targetGroupId };
    } catch {
      logAiCall('suggest', false, Date.now() - start);
      throw new AiUnavailableError();
    }
  }

  async summarize(incident: Incident, targetGroupName: string): Promise<string> {
    const start = Date.now();
    try {
      const model = this.client.getGenerativeModel({ model: this.modelName });
      const prompt = [
        'Write a concise 2-3 sentence summary of the following incident for an on-call engineer.',
        'Plain prose only, no markdown formatting (no asterisks, headers, or bullet points).',
        '',
        `Title: ${incident.title}`,
        `Description: ${incident.description}`,
        `Severity: ${incident.severity}`,
        `Status: ${incident.status}`,
        `Target group: ${targetGroupName}`,
      ].join('\n');

      const result = await model.generateContent(prompt);
      const summary = result.response.text().trim();
      if (!summary) throw new Error('Model returned an empty summary');

      logAiCall('summarize', true, Date.now() - start);
      return summary;
    } catch {
      logAiCall('summarize', false, Date.now() - start);
      throw new AiUnavailableError();
    }
  }

  async suggestRootCause(incident: Incident, targetGroupName: string): Promise<string[]> {
    const start = Date.now();
    try {
      const model = this.client.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
      });

      const prompt = [
        'Suggest 2-4 plausible root-cause hypotheses for the following incident.',
        'These are advisory hypotheses for an on-call engineer to investigate further, not definitive findings.',
        'Each hypothesis should be plain prose, no markdown formatting.',
        '',
        `Title: ${incident.title}`,
        `Description: ${incident.description}`,
        `Severity: ${incident.severity}`,
        `Status: ${incident.status}`,
        `Target group: ${targetGroupName}`,
      ].join('\n');

      const result = await model.generateContent(prompt);
      const parsed = JSON.parse(result.response.text()) as unknown;
      if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every((h) => typeof h === 'string')) {
        throw new Error('Model returned invalid root-cause hypotheses');
      }

      logAiCall('root-cause', true, Date.now() - start);
      return parsed as string[];
    } catch {
      logAiCall('root-cause', false, Date.now() - start);
      throw new AiUnavailableError();
    }
  }

  async parseIntake(
    text: string,
    groups: Group[]
  ): Promise<{ title: string; description: string; severity: Severity; targetGroupId: string }> {
    const start = Date.now();
    try {
      const model = this.client.getGenerativeModel({
        model: this.modelName,
        tools: [
          {
            functionDeclarations: [
              {
                name: CREATE_INCIDENT_DRAFT_FN,
                description: 'Extract a structured incident draft from a free-text incident report.',
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    title: { type: SchemaType.STRING, description: 'Short incident title, 5-200 characters' },
                    description: { type: SchemaType.STRING, description: 'Detailed incident description' },
                    severity: { type: SchemaType.STRING, enum: SEVERITIES },
                    targetGroupId: { type: SchemaType.STRING, enum: groups.map((g) => g.groupId) },
                  },
                  required: ['title', 'description', 'severity', 'targetGroupId'],
                },
              },
            ],
          },
        ],
        toolConfig: {
          functionCallingConfig: { mode: FunctionCallingMode.ANY, allowedFunctionNames: [CREATE_INCIDENT_DRAFT_FN] },
        },
      });

      const groupList = groups.map((g) => `- ${g.groupId} | ${g.name}: ${g.description}`).join('\n');
      const prompt = [
        `Extract a structured incident draft from the free-text report below using the ${CREATE_INCIDENT_DRAFT_FN} function.`,
        "Pick the severity and the group whose domain scope best matches the report's content.",
        '',
        `Free-text report: ${text}`,
        '',
        'Available groups (id | name: domain scope):',
        groupList,
      ].join('\n');

      const result = await model.generateContent(prompt);
      const call = result.response.functionCalls()?.[0];
      if (!call || call.name !== CREATE_INCIDENT_DRAFT_FN) throw new ParseFailedError();

      const args = call.args as Record<string, unknown>;
      if (
        typeof args.title !== 'string' ||
        args.title.length < 5 ||
        typeof args.description !== 'string' ||
        args.description.length < 10 ||
        typeof args.severity !== 'string' ||
        !SEVERITIES.includes(args.severity as Severity) ||
        typeof args.targetGroupId !== 'string' ||
        !groups.some((g) => g.groupId === args.targetGroupId)
      ) {
        throw new ParseFailedError();
      }

      logAiCall('intake', true, Date.now() - start);
      return {
        title: args.title,
        description: args.description,
        severity: args.severity as Severity,
        targetGroupId: args.targetGroupId,
      };
    } catch (err) {
      logAiCall('intake', false, Date.now() - start);
      if (err instanceof ParseFailedError) throw err;
      throw new AiUnavailableError();
    }
  }
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { mkdir, writeFile, readFile, access, constants, readdir } from 'node:fs/promises';
import { join, dirname, extname, resolve, basename } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { TextExtractionService } from './textExtractionService';

type CareerStage = 'early' | 'mid' | 'leader' | 'unknown';

export type SourceType =
  | 'kaggle'
  | 'huggingface'
  | 'commonCrawl'
  | 'github'
  | 'lever'
  | 'custom';

export interface SourceConfig {
  id: string;
  type: SourceType;
  label?: string;
  enabled?: boolean;
  limit?: number;
  throttleMs?: number;
  params: Record<string, unknown>;
}

export interface PipelineOptions {
  /**
   * Root folder that will contain original and anonymized datasets.
   * Example: `/Users/admin/narrata/data`
   */
  dataRoot: string;
  /**
   * Name of local folder inside dataRoot that stores original files.
   * Defaults to `original`.
   */
  originalsFolder?: string;
  /**
   * Name of local folder inside dataRoot that stores anonymized JSON records.
   * Defaults to `anonymized`.
   */
  anonymizedFolder?: string;
  /**
   * Local path (absolute) where reversible anonymization mapping will be stored.
   * Default: `<dataRoot>/.internal/anonymization-map.json`
   */
  mappingPath?: string;
  /**
   * Supabase connection details used for uploading anonymized dataset snapshots.
   */
  supabase?: {
    url: string;
    key: string;
    bucket: string;
    folder?: string;
  };
  /**
   * Optional logger override.
   */
  logger?: RealDataLogger;
  /**
   * Skip uploading to Supabase even if credentials are present.
   */
  skipSupabaseUpload?: boolean;
  /**
   * Directory where temporary downloads should be staged. Defaults to `<dataRoot>/tmp`.
   */
  tempFolder?: string;
}

export interface RawResumeRecord {
  id: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  metadata: {
    sourceId: string;
    sourceType: SourceType;
    sourceLabel?: string;
    originalUrl?: string;
    fetchedAt: string;
    attribution?: string;
    license?: string;
    extra?: Record<string, unknown>;
  };
}

export interface ParsedResume {
  id: string;
  fileName: string;
  mimeType: string;
  text: string;
  tokens: string[];
  contact: ContactInfo;
  workHistory: WorkHistoryEntry[];
  education: EducationEntry[];
  skills: string[];
  summary?: string;
  metadata: RawResumeRecord['metadata'] & {
    checksum: string;
    wordCount: number;
    inferredCareerStage: CareerStage;
    yearsExperience?: number;
    linkedinUrl?: string;
  };
}

export interface AnonymizedResume {
  id: string;
  text: string;
  contact: ContactInfo;
  workHistory: WorkHistoryEntry[];
  education: EducationEntry[];
  skills: string[];
  summary?: string;
  metadata: ParsedResume['metadata'] & {
    anonymization: {
      replaced: Record<string, string>;
      removedFields: string[];
    };
  };
}

export interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  websites?: string[];
}

export interface WorkHistoryEntry {
  role: string;
  company?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  durationMonths?: number;
  responsibilities?: string[];
  achievements?: string[];
}

export interface EducationEntry {
  institution: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  achievements?: string[];
}

export interface CareerDistribution {
  early: number;
  mid: number;
  leader: number;
}

export interface PipelineRunOptions {
  /**
   * Distribution target for anonymized dataset. Defaults to { early: 2, mid: 6, leader: 2 }.
   */
  targetDistribution?: CareerDistribution;
  /**
   * Maximum total resumes to process.
   */
  maxTotal?: number;
  /**
   * Skip LinkedIn enrichment step.
   */
  skipLinkedInLookup?: boolean;
  /**
   * Dry run: fetch metadata only without writing files.
   */
  dryRun?: boolean;
}

export interface SourceAdapter {
  readonly type: SourceType;
  fetchResumes(config: SourceConfig, ctx: AdapterContext): Promise<RawResumeRecord[]>;
}

export interface AdapterContext {
  logger: RealDataLogger;
  tempDir: string;
}

export interface RealDataLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

class ConsoleLogger implements RealDataLogger {
  info(message: string, context?: Record<string, unknown>): void {
    console.log(`ℹ️  ${message}`, context ? JSON.stringify(context, null, 2) : '');
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(`⚠️  ${message}`, context ? JSON.stringify(context, null, 2) : '');
  }

  error(message: string, context?: Record<string, unknown>): void {
    console.error(`❌ ${message}`, context ? JSON.stringify(context, null, 2) : '');
  }
}

const DEFAULT_TARGET_DISTRIBUTION: CareerDistribution = {
  early: 2,
  mid: 6,
  leader: 2
};

const CAREER_STAGE_ORDER: CareerStage[] = ['mid', 'leader', 'early', 'unknown'];

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
async function ensureDir(targetPath: string): Promise<void> {
  await mkdir(targetPath, { recursive: true });
}

/**
 * Check if a file exists.
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalized career stage label.
 */
function normalizeCareerStage(input?: string | null): CareerStage {
  if (!input) return 'unknown';
  const value = input.toLowerCase();
  if (['early', 'entry', 'junior', 'associate'].some(key => value.includes(key))) {
    return 'early';
  }
  if (['mid', 'senior', 'ic', 'staff', 'principal'].some(key => value.includes(key))) {
    return 'mid';
  }
  if (['leader', 'director', 'vp', 'head', 'executive', 'lead'].some(key => value.includes(key))) {
    return 'leader';
  }
  return 'unknown';
}

/**
 * Basic hashed identifier helper.
 */
function hashContent(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Attempt to parse YYYY or YYYY-MM date strings into ISO.
 */
function normalizeDate(value?: string): string | undefined {
  if (!value) return undefined;
  const cleaned = value.trim();
  if (/^\d{4}$/.test(cleaned)) {
    return `${cleaned}-01-01`;
  }
  const iso = Date.parse(cleaned);
  if (!Number.isNaN(iso)) {
    return new Date(iso).toISOString().split('T')[0]!;
  }
  return undefined;
}

/**
 * Derive months between two ISO dates.
 */
function calculateDurationMonths(start?: string, end?: string): number | undefined {
  if (!start) return undefined;
  const startDate = Date.parse(start);
  const endDate = end ? Date.parse(end) : Date.now();
  if (Number.isNaN(startDate) || Number.isNaN(endDate)) return undefined;
  const diffMs = endDate - startDate;
  if (diffMs <= 0) return undefined;
  return Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.4375));
}

/**
 * Lightweight resume parser to extract contact info, work history, education, and skills.
 */
class ResumeParser {
  parse(text: string, id: string, fileName: string, mimeType: string, metadata: RawResumeRecord['metadata']): ParsedResume {
    const tokens = text.split(/\s+/).filter(Boolean);
    const wordCount = tokens.length;

    const contact = this.extractContactInfo(text);
    const workHistory = this.extractWorkHistory(text);
    const education = this.extractEducation(text);
    const skills = this.extractSkills(text);
    const summary = this.extractSummary(text);
    const careerStage = this.inferCareerStage(workHistory, contact);
    const yearsExperience = this.computeYearsExperience(workHistory);

    return {
      id,
      fileName,
      mimeType,
      text,
      tokens,
      contact,
      workHistory,
      education,
      skills,
      summary,
      metadata: {
        ...metadata,
        checksum: this.computeChecksum(tokens),
        wordCount,
        inferredCareerStage: careerStage,
        yearsExperience
      }
    };
  }

  private extractContactInfo(text: string): ContactInfo {
    const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const phoneMatch = text.match(/(\+\d{1,2}\s?)?(\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/);
    const linkedinMatch = text.match(/linkedin\.com\/in\/[A-Za-z0-9\-_%]+/i);
    const websiteMatches = Array.from(text.matchAll(/https?:\/\/[^\s)]+/gi))
      .map(m => m[0])
      .filter(url => !/linkedin\.com\/in\//i.test(url));

    const nameLine = text.split('\n').find(line => line.trim().length > 0 && /^[A-Z][A-Za-z\s'.-]{2,}$/.test(line.trim()));

    return {
      name: nameLine?.trim(),
      email: emailMatch?.[0]?.toLowerCase(),
      phone: phoneMatch?.[0],
      location: this.extractLocation(text),
      linkedin: linkedinMatch ? `https://${linkedinMatch[0]}`.replace('https://https://', 'https://') : undefined,
      websites: websiteMatches.slice(0, 5)
    };
  }

  private extractLocation(text: string): string | undefined {
    const locationMatch = text.match(/\b(?:Based in|Location|Lives in|San Francisco|Seattle|New York|Austin|Toronto|London|Berlin|Paris|Tokyo)\b[:\s]*([A-Za-z.,\s]+)/i);
    if (locationMatch?.[1]) {
      return locationMatch[1].split('\n')[0]?.trim();
    }
    return undefined;
  }

  private extractWorkHistory(text: string): WorkHistoryEntry[] {
    const sections = text.split(/\n{2,}/);
    const history: WorkHistoryEntry[] = [];

    sections.forEach(section => {
      if (!/(experience|product|manager|lead)/i.test(section)) return;

      const roleMatch = section.match(/^(.*?)\s+(?:at|@)\s+(.*)$/im);
      const dateMatch = section.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|\d{4})[^\n]*?(Present|\d{4})/i);
      const companyMatch = section.match(/(?:at|@)\s+([A-Za-z0-9&.,'() -]{2,})/i);

      const responsibilities = section
        .split('\n')
        .filter(line => line.trim().startsWith('•') || line.trim().startsWith('-'))
        .map(line => line.replace(/^[-•]\s*/, '').trim());

      const startDateRaw = dateMatch ? section.substring(dateMatch.index ?? 0).split(/–|-/)[0]?.trim() : undefined;
      const endDateRaw = dateMatch ? section.substring(dateMatch.index ?? 0).split(/–|-/)[1]?.split('\n')[0]?.trim() : undefined;

      const startDate = normalizeDate(startDateRaw);
      const endDate = normalizeDate(endDateRaw);

      if (roleMatch) {
        history.push({
          role: roleMatch[1]?.trim() || '',
          company: companyMatch?.[1]?.trim(),
          location: undefined,
          startDate,
          endDate,
          durationMonths: calculateDurationMonths(startDate, endDate),
          responsibilities,
          achievements: responsibilities.filter(item => /%|\$|improv/i.test(item))
        });
      }
    });

    return history.slice(0, 12);
  }

  private extractEducation(text: string): EducationEntry[] {
    const sections = text.split(/\n{2,}/);
    const education: EducationEntry[] = [];

    sections.forEach(section => {
      if (!/(education|university|bachelor|master|mba|college)/i.test(section)) return;

      const institutionMatch = section.match(/([A-Za-z&'.\s]+University|[A-Za-z&'.\s]+College|MBA|B\.?S\.?|B\.?A\.?)/);
      if (!institutionMatch) return;

      const degreeMatch = section.match(/(Bachelor|Master|MBA|B\.?S\.?|B\.?A\.?|M\.?S\.?)/);
      const fieldMatch = section.match(/in\s+([A-Za-z &]+)/i);
      const dateMatch = section.match(/(\d{4})/g);

      education.push({
        institution: institutionMatch[0]?.trim() ?? 'Unknown Institution',
        degree: degreeMatch?.[0],
        field: fieldMatch?.[1]?.trim(),
        startDate: normalizeDate(dateMatch?.[0]),
        endDate: normalizeDate(dateMatch?.[1]),
        achievements: section
          .split('\n')
          .filter(line => line.trim().startsWith('-') || line.includes('GPA'))
          .map(line => line.replace(/^[-•]\s*/, '').trim())
      });
    });

    return education.slice(0, 5);
  }

  private extractSkills(text: string): string[] {
    const skillsLine = text.split('\n').find(line => /skills|competenc/i.test(line));
    if (!skillsLine) return [];
    return skillsLine
      .split(/[:,]/)
      .slice(1)
      .join(',')
      .split(/[,•]/)
      .map(skill => skill.trim())
      .filter(Boolean)
      .slice(0, 50);
  }

  private extractSummary(text: string): string | undefined {
    const firstParagraph = text.split('\n\n')[0];
    if (firstParagraph && firstParagraph.length <= 600) {
      return firstParagraph.trim();
    }
    return undefined;
  }

  private inferCareerStage(history: WorkHistoryEntry[], contact: ContactInfo): CareerStage {
    if (!history.length) return 'unknown';
    const managerRoles = history.filter(entry => /(head|director|vp|lead|manager)/i.test(entry.role));
    const seniorRoles = history.filter(entry => /(senior|principal|staff|lead)/i.test(entry.role));

    if (managerRoles.length > 0) return 'leader';
    if (seniorRoles.length > 0 || (history.length >= 3)) return 'mid';
    return 'early';
  }

  private computeYearsExperience(history: WorkHistoryEntry[]): number | undefined {
    if (!history.length) return undefined;

    const sorted = history
      .map(entry => ({
        start: entry.startDate ? Date.parse(entry.startDate) : undefined,
        end: entry.endDate ? Date.parse(entry.endDate) : Date.now()
      }))
      .filter(entry => entry.start && !Number.isNaN(entry.start) && entry.end && !Number.isNaN(entry.end))
      .sort((a, b) => (a.start ?? 0) - (b.start ?? 0));

    if (!sorted.length) return undefined;

    const earliest = sorted[0]!;
    const latest = sorted[sorted.length - 1]!;
    const diffMs = (latest.end ?? Date.now()) - (earliest.start ?? Date.now());
    if (diffMs <= 0) return undefined;
    return Math.round(diffMs / (1000 * 60 * 60 * 24 * 365));
  }

  private computeChecksum(tokens: string[]): string {
    return createHash('sha256').update(tokens.join(' ')).digest('hex');
  }
}

class ResumeTextExtractor {
  private readonly extractionService = new TextExtractionService();

  async extract(buffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    if (mimeType.startsWith('text/')) {
      return buffer.toString('utf-8');
    }
    if (mimeType === 'application/json') {
      return JSON.stringify(JSON.parse(buffer.toString('utf-8')), null, 2);
    }

    // For binary formats we leverage the existing TextExtractionService
    const FileCtor = typeof File !== 'undefined' ? File : undefined;
    if (!FileCtor) {
      throw new Error('Global File constructor is unavailable in this runtime');
    }
    const file = new FileCtor([buffer], fileName, { type: mimeType });
    const result = await this.extractionService.extractText(file);
    if (!result.success || !result.text) {
      throw new Error(`Unable to extract text from resume: ${result.error ?? 'Unknown extraction error'}`);
    }
    return result.text;
  }
}

/**
 * Lightweight LinkedIn lookup leveraging programmable search APIs.
 */
class LinkedInLookupService {
  private readonly apiKey?: string;
  private readonly cx?: string;
  private readonly throttleMs: number;
  private lastCallAt = 0;
  private readonly logger: RealDataLogger;

  constructor(logger: RealDataLogger, options?: { googleApiKey?: string; googleCx?: string; throttleMs?: number }) {
    this.logger = logger;
    this.apiKey = options?.googleApiKey ?? process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_CUSTOM_SEARCH_KEY;
    this.cx = options?.googleCx ?? process.env.GOOGLE_CX ?? process.env.GOOGLE_CUSTOM_SEARCH_CX;
    this.throttleMs = options?.throttleMs ?? 1500;
  }

  async lookupLinkedInUrl(contact: ContactInfo, roleHints: string[]): Promise<string | undefined> {
    if (!this.apiKey || !this.cx) {
      this.logger.warn('Skipping LinkedIn lookup: missing Google Custom Search credentials');
      return undefined;
    }

    const queryParts = [contact.name, ...roleHints.filter(Boolean), 'Product Manager LinkedIn'].filter(Boolean);
    const query = queryParts.join(' ');
    if (!query.trim()) return undefined;

    const now = Date.now();
    const elapsed = now - this.lastCallAt;
    if (elapsed < this.throttleMs) {
      await delay(this.throttleMs - elapsed);
    }

    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('cx', this.cx);
    url.searchParams.set('num', '3');
    url.searchParams.set('q', query);
    url.searchParams.set('safe', 'active');

    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn('LinkedIn lookup failed', { status: response.status, statusText: response.statusText });
        return undefined;
      }
      const data = (await response.json()) as { items?: Array<{ link: string }> };
      const linkedinResult = data.items?.find(item => /linkedin\.com\/in\//i.test(item.link));
      this.lastCallAt = Date.now();
      return linkedinResult?.link;
    } catch (error) {
      this.logger.error('LinkedIn lookup error', { error: error instanceof Error ? error.message : String(error) });
      return undefined;
    }
  }
}

/**
 * Detect and anonymize PII within a resume record.
 */
class ResumeAnonymizer {
  constructor(private readonly logger: RealDataLogger) {}

  anonymize(parsed: ParsedResume): { record: AnonymizedResume; mapping: Record<string, string>; removedFields: string[] } {
    const mapping: Record<string, string> = {};
    const removedFields: string[] = [];

    const anonymizedContact: ContactInfo = { ...parsed.contact };

    if (anonymizedContact.name) {
      mapping[anonymizedContact.name] = this.generatePlaceholder('Candidate');
      anonymizedContact.name = mapping[anonymizedContact.name];
    }
    if (anonymizedContact.email) {
      mapping[anonymizedContact.email] = 'candidate@example.com';
      anonymizedContact.email = 'candidate@example.com';
    }
    if (anonymizedContact.phone) {
      mapping[anonymizedContact.phone] = '+1 (555) 123-4567';
      anonymizedContact.phone = '+1 (555) 123-4567';
    }
    if (anonymizedContact.location) {
      mapping[anonymizedContact.location] = 'United States';
      anonymizedContact.location = 'United States';
    }
    if (anonymizedContact.linkedin) {
      mapping[anonymizedContact.linkedin] = 'https://www.linkedin.com/in/candidate';
      anonymizedContact.linkedin = 'https://www.linkedin.com/in/candidate';
    }
    if (anonymizedContact.websites?.length) {
      anonymizedContact.websites = anonymizedContact.websites.map(site => {
        mapping[site] = 'https://candidate-portfolio.example.com';
        return 'https://candidate-portfolio.example.com';
      });
    }

    const anonymizedWorkHistory = parsed.workHistory.map(entry => {
      const updated: WorkHistoryEntry = { ...entry };
      if (updated.company) {
        mapping[updated.company] = this.generatePlaceholder('Company');
        updated.company = mapping[updated.company];
      }
      if (updated.location) {
        mapping[updated.location] = 'United States';
        updated.location = 'United States';
      }
      if (updated.responsibilities) {
        updated.responsibilities = updated.responsibilities.map(resp => this.replaceSensitiveTokens(resp, mapping));
      }
      if (updated.achievements) {
        updated.achievements = updated.achievements.map(resp => this.replaceSensitiveTokens(resp, mapping));
      }
      return updated;
    });

    const anonymizedEducation = parsed.education.map(entry => {
      const updated: EducationEntry = { ...entry };
      if (updated.institution) {
        mapping[updated.institution] = this.generatePlaceholder('University');
        updated.institution = mapping[updated.institution];
      }
      if (updated.achievements) {
        updated.achievements = updated.achievements.map(item => this.replaceSensitiveTokens(item, mapping));
      }
      return updated;
    });

    const anonymizedSkills = parsed.skills.map(skill => this.replaceSensitiveTokens(skill, mapping));
    const anonymizedSummary = parsed.summary ? this.replaceSensitiveTokens(parsed.summary, mapping) : undefined;

    const sensitiveTokens = Object.keys(mapping).filter(Boolean);
    let anonymizedText = parsed.text;
    sensitiveTokens.forEach(token => {
      const placeholder = mapping[token];
      if (token && placeholder) {
        anonymizedText = anonymizedText.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), placeholder);
      }
    });

    const record: AnonymizedResume = {
      id: parsed.id,
      text: anonymizedText,
      contact: anonymizedContact,
      workHistory: anonymizedWorkHistory,
      education: anonymizedEducation,
      skills: anonymizedSkills,
      summary: anonymizedSummary,
      metadata: {
        ...parsed.metadata,
        anonymization: {
          replaced: mapping,
          removedFields
        }
      }
    };

    return { record, mapping, removedFields };
  }

  private generatePlaceholder(prefix: string): string {
    return `${prefix} ${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  }

  private replaceSensitiveTokens(value: string, mapping: Record<string, string>): string {
    return Object.entries(mapping).reduce((acc, [token, placeholder]) => {
      if (!token) return acc;
      return acc.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), placeholder);
    }, value);
  }
}

/**
 * Persist anonymization mapping securely on disk.
 */
class AnonymizationMappingStore {
  private readonly mappingPath: string;

  constructor(mappingPath: string) {
    this.mappingPath = mappingPath;
  }

  async load(): Promise<Record<string, Record<string, string>>> {
    if (!(await fileExists(this.mappingPath))) {
      return {};
    }

    const content = await readFile(this.mappingPath, 'utf-8');
    try {
      return JSON.parse(content) as Record<string, Record<string, string>>;
    } catch (error) {
      throw new Error(`Failed to parse anonymization mapping: ${(error as Error).message}`);
    }
  }

  async save(mapping: Record<string, Record<string, string>>): Promise<void> {
    const dir = dirname(this.mappingPath);
    await ensureDir(dir);
    await writeFile(this.mappingPath, JSON.stringify(mapping, null, 2), 'utf-8');
  }
}

/**
 * Provenance ledger persisted alongside original files.
 */
class ProvenanceLedger {
  private readonly ledgerPath: string;

  constructor(dataRoot: string) {
    this.ledgerPath = join(dataRoot, 'provenance-ledger.json');
  }

  async append(entry: Record<string, unknown>): Promise<void> {
    const existing = await this.getEntries();
    existing.push(entry);
    await writeFile(this.ledgerPath, JSON.stringify(existing, null, 2), 'utf-8');
  }

  async getEntries(): Promise<Record<string, unknown>[]> {
    if (!(await fileExists(this.ledgerPath))) {
      return [];
    }
    const content = await readFile(this.ledgerPath, 'utf-8');
    try {
      return JSON.parse(content) as Record<string, unknown>[];
    } catch {
      return [];
    }
  }
}

/**
 * Base adapter with utility helpers.
 */
abstract class BaseSourceAdapter implements SourceAdapter {
  abstract readonly type: SourceType;

  constructor(protected readonly logger: RealDataLogger) {}

  abstract fetchResumes(config: SourceConfig, ctx: AdapterContext): Promise<RawResumeRecord[]>;

  protected async throttle(ms?: number): Promise<void> {
    if (!ms) return;
    await delay(ms);
  }
}

class KaggleSourceAdapter extends BaseSourceAdapter {
  readonly type: SourceType = 'kaggle';

  async fetchResumes(config: SourceConfig, ctx: AdapterContext): Promise<RawResumeRecord[]> {
    const dataset = String(config.params.dataset ?? '');
    if (!dataset) {
      throw new Error('Kaggle adapter requires params.dataset');
    }

    const files = Array.isArray(config.params.files) ? (config.params.files as string[]) : undefined;
    const username = process.env.KAGGLE_USERNAME;
    const key = process.env.KAGGLE_KEY;
    if (!username || !key) {
      throw new Error('Kaggle adapter requires KAGGLE_USERNAME and KAGGLE_KEY environment variables');
    }

    this.logger.info('Fetching Kaggle dataset', { dataset, files });

    const targetDir = join(ctx.tempDir, `kaggle-${dataset.replace('/', '-')}-${Date.now()}`);
    await ensureDir(targetDir);

    await this.runKaggleCli(['datasets', 'download', dataset, '--path', targetDir, '--unzip', ...(files ? files.flatMap(file => ['--file', file]) : [])]);

    const resumeFiles = await this.collectResumeFiles(targetDir, files);

    return Promise.all(
      resumeFiles.slice(0, config.limit ?? resumeFiles.length).map(async filePath => {
        const buffer = await readFile(filePath);
        return this.createRecord(buffer, filePath, dataset, config);
      })
    );
  }

  private async runKaggleCli(args: string[]): Promise<void> {
    await new Promise<void>((resolvePromise, rejectPromise) => {
      const child = spawn('kaggle', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          KAGGLE_USERNAME: process.env.KAGGLE_USERNAME,
          KAGGLE_KEY: process.env.KAGGLE_KEY
        }
      });

      let stderr = '';
      child.stderr?.on('data', data => {
        stderr += data.toString();
      });

      child.on('close', code => {
        if (code === 0) {
          resolvePromise();
        } else {
          rejectPromise(new Error(`Kaggle CLI exited with code ${code}: ${stderr}`));
        }
      });
    });
  }

  private async collectResumeFiles(targetDir: string, preferredFiles?: string[]): Promise<string[]> {
    const entries = await readdir(targetDir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const entryPath = join(targetDir, entry.name);
      if (entry.isFile()) {
        if (this.isSupportedResumeFile(entry.name)) {
          files.push(entryPath);
        }
      } else if (entry.isDirectory()) {
        const nested = await this.collectResumeFiles(entryPath, preferredFiles);
        files.push(...nested);
      }
    }
    if (preferredFiles?.length) {
      return files.filter(filePath => preferredFiles.includes(basename(filePath)));
    }
    return files;
  }

  private isSupportedResumeFile(fileName: string): boolean {
    return /\.(pdf|docx?|txt|md)$/i.test(fileName);
  }

  private async createRecord(buffer: Buffer, filePath: string, dataset: string, config: SourceConfig): Promise<RawResumeRecord> {
    const metadata: RawResumeRecord['metadata'] = {
      sourceId: config.id,
      sourceType: this.type,
      sourceLabel: config.label,
      originalUrl: `https://www.kaggle.com/datasets/${dataset}`,
      fetchedAt: new Date().toISOString(),
      extra: {
        dataset,
        filePath
      }
    };
    return {
      id: randomUUID(),
      fileName: basename(filePath),
      mimeType: this.getMimeType(filePath),
      buffer,
      metadata
    };
  }

  private getMimeType(filePath: string): string {
    const ext = extname(filePath).toLowerCase();
    switch (ext) {
      case '.pdf':
        return 'application/pdf';
      case '.doc':
        return 'application/msword';
      case '.docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case '.md':
        return 'text/markdown';
      default:
        return 'text/plain';
    }
  }
}

class HuggingFaceSourceAdapter extends BaseSourceAdapter {
  readonly type: SourceType = 'huggingface';

  async fetchResumes(config: SourceConfig): Promise<RawResumeRecord[]> {
    const datasetId = String(config.params.dataset ?? '');
    const dataFiles = Array.isArray(config.params.files) ? (config.params.files as string[]) : undefined;
    const revision = String(config.params.revision ?? 'main');
    const authToken = (config.params.token as string | undefined) ?? process.env.HF_TOKEN;

    if (!datasetId) {
      throw new Error('HuggingFace adapter requires params.dataset');
    }

    this.logger.info('Fetching HuggingFace dataset metadata', { datasetId, revision });

    const infoUrl = new URL('https://datasets-server.huggingface.co/info');
    infoUrl.searchParams.set('dataset', datasetId);
    if (revision) {
      infoUrl.searchParams.set('revision', revision);
    }

    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : undefined;
    const infoResponse = await fetch(infoUrl, { headers });
    if (!infoResponse.ok) {
      throw new Error(`Failed to load dataset info (${infoResponse.status})`);
    }
    const info = (await infoResponse.json()) as { siblings?: Array<{ rfilename: string }> };

    const candidateFiles = (info.siblings ?? [])
      .map(file => file.rfilename)
      .filter(fileName => /\.(pdf|docx?|txt|md|jsonl?)$/i.test(fileName));

    const filesToDownload = dataFiles?.length ? candidateFiles.filter(file => dataFiles.includes(file)) : candidateFiles;
    const limit = config.limit ?? filesToDownload.length;

    const results: RawResumeRecord[] = [];

    for (const fileName of filesToDownload.slice(0, limit)) {
      await this.throttle(config.throttleMs);
      const downloadUrl = `https://huggingface.co/datasets/${datasetId}/resolve/${revision}/${fileName}`;
      this.logger.info('Downloading HuggingFace file', { downloadUrl });

      const response = await fetch(downloadUrl, { headers });
      if (!response.ok || !response.body) {
        this.logger.warn('Skipping file download due to response issue', { status: response.status, fileName });
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      results.push({
        id: randomUUID(),
        fileName,
        mimeType: this.getMimeType(fileName),
        buffer,
        metadata: {
          sourceId: config.id,
          sourceType: this.type,
          sourceLabel: config.label,
          originalUrl: downloadUrl,
          fetchedAt: new Date().toISOString(),
          license: (config.params.license as string | undefined) ?? 'Review dataset card',
          extra: { datasetId, revision }
        }
      });
    }

    return results;
  }

  private getMimeType(fileName: string): string {
    const ext = extname(fileName).toLowerCase();
    switch (ext) {
      case '.pdf':
        return 'application/pdf';
      case '.doc':
      case '.docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case '.json':
      case '.jsonl':
        return 'application/json';
      case '.md':
        return 'text/markdown';
      default:
        return 'text/plain';
    }
  }
}

class CommonCrawlSourceAdapter extends BaseSourceAdapter {
  readonly type: SourceType = 'commonCrawl';

  async fetchResumes(config: SourceConfig): Promise<RawResumeRecord[]> {
    const searchQuery = String(config.params.query ?? 'product manager resume pdf');
    const index = String(config.params.index ?? 'CC-MAIN-2024-33-index');
    const limit = config.limit ?? 5;

    const searchUrl = new URL(`https://index.commoncrawl.org/${index}`);
    searchUrl.searchParams.set('url', searchQuery);
    searchUrl.searchParams.set('output', 'json');
    searchUrl.searchParams.set('page', '0');

    this.logger.info('Querying Common Crawl index', { index, searchQuery });

    const indexResponse = await fetch(searchUrl);
    if (!indexResponse.ok) {
      throw new Error(`Failed to query Common Crawl index (${indexResponse.status})`);
    }

    const lines = (await indexResponse.text()).trim().split('\n');
    const candidates = lines
      .map(line => {
        try {
          return JSON.parse(line) as { url: string; filename: string; mime?: string; offset: string; length: string; digest?: string };
        } catch {
          return null;
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .slice(0, limit);

    const records: RawResumeRecord[] = [];

    for (const entry of candidates) {
      await this.throttle(config.throttleMs ?? 2000);
      const { url, filename } = entry;
      this.logger.info('Fetching Common Crawl document', { url });

      const response = await fetch(url);
      if (!response.ok) {
        this.logger.warn('Common Crawl fetch failed', { status: response.status, url });
        continue;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength < 200) {
        this.logger.warn('Skipping extremely small Common Crawl artifact', { url });
        continue;
      }

      const extension = extname(filename || url.split('?')[0] ?? '').toLowerCase();
      const mimeType = this.getMimeTypeFromExtension(extension);

      records.push({
        id: randomUUID(),
        fileName: filename || `${createHash('md5').update(url).digest('hex')}${extension || '.html'}`,
        mimeType,
        buffer,
        metadata: {
          sourceId: config.id,
          sourceType: this.type,
          sourceLabel: config.label,
          originalUrl: url,
          fetchedAt: new Date().toISOString(),
          extra: {
            index,
            filename,
            digest: entry.digest
          }
        }
      });
    }

    return records;
  }

  private getMimeTypeFromExtension(ext: string): string {
    switch (ext) {
      case '.pdf':
        return 'application/pdf';
      case '.doc':
      case '.docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case '.txt':
      case '.md':
        return 'text/plain';
      default:
        return 'text/html';
    }
  }
}

class GitHubResumeSourceAdapter extends BaseSourceAdapter {
  readonly type: SourceType = 'github';

  async fetchResumes(config: SourceConfig): Promise<RawResumeRecord[]> {
    const searchQuery = String(config.params.search ?? 'Product Manager resume filename:resume.md');
    const limit = config.limit ?? 5;
    const githubToken = (config.params.token as string | undefined) ?? process.env.GITHUB_TOKEN;

    this.logger.info('Searching GitHub for resumes', { searchQuery, limit });

    const apiUrl = new URL('https://api.github.com/search/code');
    apiUrl.searchParams.set('q', searchQuery);
    apiUrl.searchParams.set('per_page', String(Math.min(limit, 100)));

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {})
    };

    const response = await fetch(apiUrl, { headers });
    if (!response.ok) {
      throw new Error(`GitHub search failed (${response.status})`);
    }
    const data = (await response.json()) as { items?: Array<{ repository: { full_name: string; html_url: string }; path: string; html_url: string; url: string }> };
    const items = data.items ?? [];

    const records: RawResumeRecord[] = [];

    for (const item of items.slice(0, limit)) {
      await this.throttle(config.throttleMs ?? 1500);

      const rawUrl = `https://raw.githubusercontent.com/${item.repository.full_name}/HEAD/${item.path}`;
      this.logger.info('Downloading GitHub resume', { rawUrl });
      const fileResponse = await fetch(rawUrl, { headers });
      if (!fileResponse.ok) {
        this.logger.warn('Failed to download GitHub file', { status: fileResponse.status, rawUrl });
        continue;
      }
      const buffer = Buffer.from(await fileResponse.arrayBuffer());
      if (buffer.byteLength < 200) {
        this.logger.warn('Skipping tiny GitHub resume candidate', { rawUrl });
        continue;
      }

      records.push({
        id: randomUUID(),
        fileName: basename(item.path),
        mimeType: this.getMimeType(item.path),
        buffer,
        metadata: {
          sourceId: config.id,
          sourceType: this.type,
          sourceLabel: config.label,
          originalUrl: item.html_url,
          fetchedAt: new Date().toISOString(),
          extra: {
            repository: item.repository.full_name,
            path: item.path
          }
        }
      });
    }

    return records;
  }

  private getMimeType(filePath: string): string {
    const ext = extname(filePath).toLowerCase();
    switch (ext) {
      case '.pdf':
        return 'application/pdf';
      case '.doc':
      case '.docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case '.md':
        return 'text/markdown';
      default:
        return 'text/plain';
    }
  }
}

class LeverSourceAdapter extends BaseSourceAdapter {
  readonly type: SourceType = 'lever';

  async fetchResumes(config: SourceConfig): Promise<RawResumeRecord[]> {
    const company = String(config.params.company ?? '');
    const department = String(config.params.department ?? 'Product');
    const limit = config.limit ?? 5;

    if (!company) {
      throw new Error('Lever adapter requires params.company');
    }

    const apiUrl = new URL(`https://api.lever.co/v0/postings/${company}`);
    apiUrl.searchParams.set('limit', String(limit));
    apiUrl.searchParams.set('department', department);

    this.logger.info('Querying Lever postings', { company, department });

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Lever API request failed (${response.status})`);
    }
    const postings = (await response.json()) as Array<{
      text: string;
      hostedUrl: string;
      categories: Record<string, string>;
      additional: Record<string, string>;
    }>;

    const records: RawResumeRecord[] = [];

    for (const posting of postings) {
      const text = posting.text;
      if (!text) continue;

      const buffer = Buffer.from(text, 'utf-8');
      records.push({
        id: randomUUID(),
        fileName: `${company}-${posting.categories.team ?? 'product'}.txt`,
        mimeType: 'text/plain',
        buffer,
        metadata: {
          sourceId: config.id,
          sourceType: this.type,
          sourceLabel: config.label,
          originalUrl: posting.hostedUrl,
          fetchedAt: new Date().toISOString(),
          extra: {
            categories: posting.categories,
            additional: posting.additional
          }
        }
      });
    }

    return records.slice(0, limit);
  }
}

const DEFAULT_ADAPTER_FACTORIES: Record<SourceType, (logger: RealDataLogger) => SourceAdapter> = {
  kaggle: logger => new KaggleSourceAdapter(logger),
  huggingface: logger => new HuggingFaceSourceAdapter(logger),
  commonCrawl: logger => new CommonCrawlSourceAdapter(logger),
  github: logger => new GitHubResumeSourceAdapter(logger),
  lever: logger => new LeverSourceAdapter(logger),
  custom: logger => new CustomSourceAdapter(logger)
};

class CustomSourceAdapter extends BaseSourceAdapter {
  readonly type: SourceType = 'custom';

  async fetchResumes(config: SourceConfig): Promise<RawResumeRecord[]> {
    const files = Array.isArray(config.params.files) ? (config.params.files as string[]) : [];
    if (!files.length) {
      throw new Error('Custom adapter requires params.files array');
    }

    const records: RawResumeRecord[] = [];
    for (const filePath of files) {
      const absolutePath = resolve(String(filePath));
      this.logger.info('Loading custom resume file', { filePath: absolutePath });
      const buffer = await readFile(absolutePath);
      records.push({
        id: randomUUID(),
        fileName: basename(absolutePath),
        mimeType: this.getMimeType(absolutePath),
        buffer,
        metadata: {
          sourceId: config.id,
          sourceType: this.type,
          sourceLabel: config.label,
          originalUrl: absolutePath,
          fetchedAt: new Date().toISOString()
        }
      });
    }

    return records.slice(0, config.limit ?? records.length);
  }

  private getMimeType(filePath: string): string {
    const ext = extname(filePath).toLowerCase();
    switch (ext) {
      case '.pdf':
        return 'application/pdf';
      case '.doc':
      case '.docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case '.md':
        return 'text/markdown';
      case '.json':
        return 'application/json';
      default:
        return 'text/plain';
    }
  }
}

export class RealDataPipeline {
  private readonly options: Required<Omit<PipelineOptions, 'logger' | 'supabase'>> & {
    supabase?: PipelineOptions['supabase'];
  };
  private readonly logger: RealDataLogger;
  private readonly adapters: Map<SourceType, SourceAdapter>;
  private readonly parser: ResumeParser;
  private readonly textExtractor: ResumeTextExtractor;
  private readonly anonymizer: ResumeAnonymizer;
  private readonly mappingStore: AnonymizationMappingStore;
  private readonly ledger: ProvenanceLedger;
  private readonly linkedInLookup: LinkedInLookupService;
  private readonly supabaseClient?: SupabaseClient;

  constructor(options: PipelineOptions) {
    if (!options.dataRoot) {
      throw new Error('RealDataPipeline requires dataRoot');
    }

    this.logger = options.logger ?? new ConsoleLogger();
    this.options = {
      dataRoot: options.dataRoot,
      originalsFolder: options.originalsFolder ?? 'original',
      anonymizedFolder: options.anonymizedFolder ?? 'anonymized',
      mappingPath: options.mappingPath ?? join(options.dataRoot, '.internal', 'anonymization-map.json'),
      skipSupabaseUpload: options.skipSupabaseUpload ?? false,
      tempFolder: options.tempFolder ?? join(options.dataRoot, 'tmp')
    };
    this.options.supabase = options.supabase;

    this.adapters = new Map();
    Object.entries(DEFAULT_ADAPTER_FACTORIES).forEach(([type, factory]) => {
      this.adapters.set(type as SourceType, factory(this.logger));
    });
    this.parser = new ResumeParser();
    this.textExtractor = new ResumeTextExtractor();
    this.anonymizer = new ResumeAnonymizer(this.logger);
    this.mappingStore = new AnonymizationMappingStore(this.options.mappingPath);
    this.ledger = new ProvenanceLedger(options.dataRoot);
    this.linkedInLookup = new LinkedInLookupService(this.logger, {
      googleApiKey: process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_CUSTOM_SEARCH_KEY,
      googleCx: process.env.GOOGLE_CX ?? process.env.GOOGLE_CUSTOM_SEARCH_CX
    });

    if (options.supabase && !options.skipSupabaseUpload) {
      this.supabaseClient = createClient(options.supabase.url, options.supabase.key);
    }
  }

  async run(sourceConfigs: SourceConfig[], runOptions: PipelineRunOptions = {}): Promise<{
    originalsCount: number;
    anonymizedCount: number;
    distribution: Record<CareerStage, number>;
    uploadedCount: number;
  }> {
    const targetDistribution = runOptions.targetDistribution ?? DEFAULT_TARGET_DISTRIBUTION;
    const processedDistribution: Record<CareerStage, number> = {
      early: 0,
      mid: 0,
      leader: 0,
      unknown: 0
    };

    const originalsDir = join(this.options.dataRoot, this.options.originalsFolder);
    const anonymizedDir = join(this.options.dataRoot, this.options.anonymizedFolder);
    const tempDir = this.options.tempFolder;

    await ensureDir(originalsDir);
    await ensureDir(anonymizedDir);
    await ensureDir(tempDir);

    const mapping = await this.mappingStore.load();
    let uploadedCount = 0;
    let originalsCount = 0;
    let anonymizedCount = 0;

    for (const config of sourceConfigs.filter(cfg => cfg.enabled !== false)) {
      const adapter = this.adapters.get(config.type);
      if (!adapter) {
        this.logger.warn('No adapter registered for source type, skipping', { sourceType: config.type });
        continue;
      }
      this.logger.info('Processing source', { sourceId: config.id, type: config.type, label: config.label });

      const ctx: AdapterContext = {
        logger: this.logger,
        tempDir
      };

      let rawRecords: RawResumeRecord[] = [];
      try {
        rawRecords = await adapter.fetchResumes(config, ctx);
      } catch (error) {
        this.logger.error('Failed to ingest source', {
          sourceId: config.id,
          error: error instanceof Error ? error.message : String(error)
        });
        continue;
      }

      this.logger.info('Fetched raw resumes', { count: rawRecords.length, sourceId: config.id });

      for (const rawRecord of rawRecords) {
        const stageQuotaReached = this.isStageQuotaReached(processedDistribution, targetDistribution);
        if (stageQuotaReached) {
          this.logger.info('Target distribution met, stopping ingestion');
          break;
        }

        const stage = this.pickCareerStage(processedDistribution, targetDistribution);
        if (stage === 'unknown') {
          this.logger.warn('Unable to allocate career stage quota, skipping record', { recordId: rawRecord.id });
          continue;
        }

        if (runOptions.maxTotal && anonymizedCount >= runOptions.maxTotal) {
          this.logger.info('Reached max total records, stopping pipeline');
          break;
        }

        const resumeId = rawRecord.id;

        if (!runOptions.dryRun) {
          const originalPath = join(originalsDir, `${resumeId}_${rawRecord.fileName}`);
          await writeFile(originalPath, rawRecord.buffer);
          originalsCount += 1;
          await this.ledger.append({
            resumeId,
            stageTarget: stage,
            originalPath,
            metadata: rawRecord.metadata,
            storedAt: new Date().toISOString()
          });
        }

        let extractedText: string;
        try {
          extractedText = await this.textExtractor.extract(rawRecord.buffer, rawRecord.fileName, rawRecord.mimeType);
        } catch (error) {
          this.logger.warn('Failed to extract text, skipping resume', {
            resumeId,
            error: error instanceof Error ? error.message : String(error)
          });
          continue;
        }

        const parsed = this.parser.parse(extractedText, rawRecord.id, rawRecord.fileName, rawRecord.mimeType, rawRecord.metadata);

        if (!runOptions.skipLinkedInLookup) {
          const linkedInUrl = await this.linkedInLookup.lookupLinkedInUrl(parsed.contact, [
            parsed.workHistory[0]?.company ?? '',
            parsed.workHistory[0]?.role ?? ''
          ]);
          if (linkedInUrl) {
            parsed.metadata.linkedinUrl = linkedInUrl;
          }
        }

        const { record: anonymized, mapping: recordMapping, removedFields } = this.anonymizer.anonymize(parsed);
        processedDistribution[anonymized.metadata.inferredCareerStage] =
          (processedDistribution[anonymized.metadata.inferredCareerStage] ?? 0) + 1;

        mapping[resumeId] = {
          ...mapping[resumeId],
          ...recordMapping
        };
        if (removedFields.length) {
          this.logger.info('Removed sensitive fields during anonymization', { resumeId, removedFields });
        }

        if (!runOptions.dryRun) {
          const anonymizedPath = join(anonymizedDir, `${resumeId}.json`);
          await writeFile(anonymizedPath, JSON.stringify(anonymized, null, 2), 'utf-8');
          anonymizedCount += 1;
        }

        if (this.supabaseClient && !this.options.skipSupabaseUpload && !runOptions.dryRun) {
          try {
            const uploadResult = await this.uploadToSupabase(anonymized);
            if (uploadResult) {
              uploadedCount += 1;
            }
          } catch (error) {
            this.logger.error('Failed to upload anonymized resume to Supabase', {
              resumeId,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }
    }

    if (!runOptions.dryRun) {
      await this.mappingStore.save(mapping);
    }

    return {
      originalsCount,
      anonymizedCount,
      distribution: processedDistribution,
      uploadedCount
    };
  }

  private isStageQuotaReached(current: Record<CareerStage, number>, target: CareerDistribution): boolean {
    return (
      current.early >= target.early &&
      current.mid >= target.mid &&
      current.leader >= target.leader
    );
  }

  private pickCareerStage(current: Record<CareerStage, number>, target: CareerDistribution): CareerStage {
    for (const stage of CAREER_STAGE_ORDER) {
      if (stage === 'mid' && current.mid < target.mid) return 'mid';
      if (stage === 'leader' && current.leader < target.leader) return 'leader';
      if (stage === 'early' && current.early < target.early) return 'early';
    }
    return 'unknown';
  }

  private async uploadToSupabase(anonymized: AnonymizedResume): Promise<boolean> {
    if (!this.supabaseClient || !this.options.supabase) {
      return false;
    }
    const bucket = this.options.supabase.bucket;
    const folder = this.options.supabase.folder ?? 'pm-resumes';
    const objectPath = `${folder}/${anonymized.id}.json`;

    const { data, error } = await this.supabaseClient.storage
      .from(bucket)
      .upload(objectPath, new Blob([JSON.stringify(anonymized)], { type: 'application/json' }), {
        upsert: true,
        contentType: 'application/json'
      });

    if (error) {
      throw new Error(error.message);
    }
    this.logger.info('Uploaded anonymized resume to Supabase', { objectPath, etag: data?.etag });
    return true;
  }
}

export function buildSourceConfigs(): SourceConfig[] {
  return [
    {
      id: 'kaggle-pm-resumes',
      type: 'kaggle',
      label: 'Kaggle PM Resume Dataset',
      enabled: true,
      limit: 5,
      params: {
        dataset: process.env.KAGGLE_PM_DATASET ?? 'promptcloud/hr-analytics-job-resume-dataset'
      }
    },
    {
      id: 'huggingface-pm-resumes',
      type: 'huggingface',
      label: 'HuggingFace PM Resume Dataset',
      enabled: true,
      limit: 3,
      params: {
        dataset: process.env.HF_PM_DATASET ?? 'LambdaLabs/PM-Resumes',
        revision: 'main'
      }
    },
    {
      id: 'github-pm-resumes',
      type: 'github',
      label: 'GitHub PM Resume Search',
      enabled: true,
      limit: 5,
      throttleMs: 1500,
      params: {
        search: '\"Product Manager\" resume filename:resume.md language:Markdown'
      }
    },
    {
      id: 'commoncrawl-pm-resumes',
      type: 'commonCrawl',
      label: 'Common Crawl Resume Harvest',
      enabled: false,
      limit: 3,
      throttleMs: 2500,
      params: {
        query: '\"Product Manager\" filetype:pdf resume',
        index: 'CC-MAIN-2024-33-index'
      }
    },
    {
      id: 'lever-pm-profiles',
      type: 'lever',
      label: 'Lever PM Candidates',
      enabled: false,
      limit: 3,
      params: {
        company: process.env.LEVER_COMPANY_SLUG ?? 'example',
        department: 'Product'
      }
    }
  ];
}


import { readFile } from 'node:fs/promises';
import path from 'node:path';

const SEARCH_SKILLS = [
  'marketing-orchestrator',
  'viral-trend-curator',
  'content-strategist',
  'hook-specialist',
] as const;

function stripFrontmatter(source: string) {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();
}

async function readProjectFile(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath), 'utf8');
}

async function loadBrandProfile(brand: string) {
  return brand === 'SAFE-K'
    ? readProjectFile(path.join('.agents', 'brands', 'safe-k.md'))
    : readProjectFile(path.join('.agents', 'brands', 'economize-vc.md'));
}

async function loadSkill(name: string) {
  return stripFrontmatter(await readProjectFile(path.join('.agents', 'skills', name, 'SKILL.md')));
}

export async function loadSearchInstructions(brand: string) {
  const skillSources = await Promise.all(
    SEARCH_SKILLS.map(async name => ({
      name,
      instructions: stripFrontmatter(
        await readProjectFile(path.join('.agents', 'skills', name, 'SKILL.md')),
      ),
    })),
  );

  const brandProfile = await loadBrandProfile(brand);
  const scoringReference = await readProjectFile(
    path.join('.agents', 'skills', 'viral-trend-curator', 'references', 'scoring.md'),
  );

  return {
    specialists: skillSources.map(skill => skill.name),
    instructions: [
      'Você é o orquestrador de pesquisa real deste aplicativo.',
      'Aplique as skills abaixo como contratos operacionais. Em conflito, os dados da marca e as restrições desta solicitação vencem.',
      ...skillSources.map(skill => `\n## Skill: ${skill.name}\n${skill.instructions}`),
      `\n## Referência obrigatória de pontuação\n${scoringReference.trim()}`,
      `\n## Perfil da marca ativa\n${brandProfile.trim()}`,
    ].join('\n'),
  };
}

export async function loadScriptInstructions(brand: string) {
  const [orchestrator, scriptwriter, hookSpecialist, brandProfile] = await Promise.all([
    loadSkill('marketing-orchestrator'),
    loadSkill('video-scriptwriter'),
    loadSkill('hook-specialist'),
    loadBrandProfile(brand),
  ]);
  return {
    specialists: ['marketing-orchestrator', 'hook-specialist', 'video-scriptwriter'],
    instructions: `Você produz um roteiro somente a partir da referência verificada recebida.\n\n## Orquestração\n${orchestrator}\n\n## Especialista em hooks\n${hookSpecialist}\n\n## Roteirista\n${scriptwriter}\n\n## Marca ativa\n${brandProfile}`,
  };
}

export async function loadReportInstructions(brand: string) {
  const [orchestrator, reporter, brandProfile] = await Promise.all([
    loadSkill('marketing-orchestrator'),
    loadSkill('daily-marketing-report'),
    loadBrandProfile(brand),
  ]);
  return {
    specialists: ['marketing-orchestrator', 'daily-marketing-report'],
    instructions: `Você consolida somente as evidências fornecidas. Não acrescente atividades, métricas ou fontes.\n\n## Orquestração\n${orchestrator}\n\n## Relatório\n${reporter}\n\n## Marca ativa\n${brandProfile}`,
  };
}

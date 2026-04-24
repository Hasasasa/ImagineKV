export interface ParsedPrompt {
  id: string;
  title: string;
  prompt: string;
  negativePrompt: string;
}

export const extractAnalysisReport = (text: string): string => {
  const match = text.match(/(?:# 🛍️ 产品分析报告|# Product Analysis Report)([\s\S]*?)(?=(?:STEP 2|### STEP 2|---|$))/i);
  return match ? match[0].trim() : "";
};

export const parseBulkPrompts = (text: string): ParsedPrompt[] => {
  const results: ParsedPrompt[] = [];

  // Strategy 0: Chinese poster blocks: "## 海报01" / "### Poster 1" followed by 生成提示词/画面设计构思 等
  // Captures the whole block until next "## 海报XX" or end; uses the block body as the prompt.
  // 允许 "海报" 前多写一个字（模型偶发 typo 如 "海海报09"），并容忍英文 Poster / Image / KV
  const posterHeader = '(?:[海一]{0,2}海报|Poster|Image|KV)\\s*\\d+';
  const posterBlockRegex = new RegExp(
    `(?:^|\\n)#{2,4}\\s*(${posterHeader}[^\\n]*)\\n([\\s\\S]*?)(?=\\n#{2,4}\\s*(?:${posterHeader})|$)`,
    'gi'
  );
  let posterMatch: RegExpExecArray | null;
  let posterIdx = 0;
  const posterText = text + "";
  while ((posterMatch = posterBlockRegex.exec(posterText)) !== null) {
    const rawTitle = (posterMatch[1] || '').trim();
    const body = (posterMatch[2] || '').trim().replace(/\n---\s*$/,'').trim();
    if (body.length < 20) continue;
    // try to use the first subtitle/bullet after the title as a more descriptive title
    const subtitleMatch = body.match(/^[\s*•\-]*([^\n]{2,40}?)\s*(?:\(|（|\n|$)/);
    const niceTitle = rawTitle || (subtitleMatch ? subtitleMatch[1].trim() : `海报 ${posterIdx + 1}`);
    results.push({
      id: `poster-${Date.now()}-${posterIdx}`,
      title: niceTitle,
      prompt: body,
      negativePrompt: ''
    });
    posterIdx++;
  }
  if (results.length > 0) return results;

  // Strategy 1: Priority Match for Rich Content Blocks (**{ ... }**)
  // This explicitly looks for the format requested in the system prompt to capture EVERYTHING inside the braces.
  // Regex Explanation:
  // 1. Capture Title line (optional ### or **Title**)
  // 2. Capture Content inside **{ ... }** or { ... }, tolerating newlines and nested structure loosely
  const richPromptRegex = /(?:###|\*\*Title\*\*:?|\*\*标题\*\*:?)\s*(.*?)\s*\n[\s\S]*?(?:\*\*\{|\{)\s*(?:生成提示词|English Prompt|Prompt|Generate Prompt)[:：]?\s*([\s\S]*?)(?:\}\*\*|\})/gi;
  
  let richMatch;
  let hasRichMatches = false;
  let index = 0;

  // Clone text to avoid iterator state issues if reused
  const textCopy = text + "";

  while ((richMatch = richPromptRegex.exec(textCopy)) !== null) {
      hasRichMatches = true;
      const titleLine = richMatch[1].trim();
      const promptContent = richMatch[2].trim();

      if (promptContent) {
          results.push({
              id: `task-${Date.now()}-${index}`,
              title: titleLine.replace(/^[\d\.\s]+/, '').replace(/\(.*\)/, '').trim() || `Poster ${index + 1}`,
              prompt: promptContent, // Contains the full prompt including design concept
              negativePrompt: ""
          });
          index++;
      }
  }

  if (hasRichMatches && results.length > 0) {
      return results;
  }

  // Strategy 2: Fallback to Block Splitting (Standard Format)
  // If the model didn't use the curly braces, we use the block splitter.
  const blockRegex = /(?:###|\*\*Title\*\*:?)\s*(.+?)(?=\n(?:###|\*\*Title\*\*)|$)/gs;
  let match;
  index = 0; // Reset index
  
  while ((match = blockRegex.exec(text)) !== null) {
      const fullBlock = match[0];
      const titleLine = match[1].split('\n')[0].trim();
      
      // Try to find "Prompt:" or "**Prompt**:"
      const promptMatch = fullBlock.match(/(?:\*\*Prompt\*\*|Prompt|提示词)[:：]\s*([\s\S]*?)(?=\*\*Negative|Negative|$)/i);
      
      if (promptMatch) {
          results.push({
              id: `fallback-${Date.now()}-${index}`,
              title: titleLine.replace(/^[\d\.\s]+/, '') || `Poster ${index + 1}`,
              prompt: promptMatch[1].trim(),
              negativePrompt: "" 
          });
          index++;
      }
  }

  // Strategy 3: Last Resort (Simple Line Split)
  if (results.length === 0) {
      const simpleBlocks = text.split(/(?=\*\*Title\*\*:)/i).filter(b => b.trim().length > 10);
      simpleBlocks.forEach((block, idx) => {
        const titleMatch = block.match(/\*\*Title\*\*:\s*(.*)/i);
        const promptMatch = block.match(/\*\*Prompt\*\*:\s*([\s\S]*?)(?=\*\*Negative Prompt\*\*|$)/i);
        
        if (promptMatch) {
          results.push({
            id: `simple-${Date.now()}-${idx}`,
            title: titleMatch ? titleMatch[1].trim() : `Poster ${idx + 1}`,
            prompt: promptMatch[1].trim(),
            negativePrompt: ""
          });
        }
      });
  }

  return results;
};
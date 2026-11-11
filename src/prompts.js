// What each button asks the model to do. Every prompt keeps the user's meaning and language
// (except Translate), and asks for the text only, so it can be pasted straight back.
const KEEP = 'Keep the meaning, the facts, names, links, emoji and line breaks. Never add facts, claims or details that are not in the text, and never add a subject line, a sign-off or placeholders like [Your Name]. Reply with only the new text: no quotes, no notes, no explanations.';

const MODES = {
  fix: 'You are a careful proofreader. Read every word and fix all spelling, grammar, punctuation and capitalisation mistakes in the user\'s text, including commonly confused words (their/there/they\'re, its/it\'s, your/you\'re, then/than, of/have), wrong verb forms and a missing capital letter at the start of a sentence. Keep the language, the tone, the wording and the formatting. Change nothing else. If the text is already correct, return it unchanged. ' + KEEP,
  clear: 'Rewrite the user\'s text so it is clearer and easier to read. Fix any mistakes. Use plain words and well-ordered sentences. Keep the language and roughly the same length. ' + KEEP,
  short: 'Make the user\'s text shorter. Cut filler and repetition, fix any mistakes, and keep every important point. Keep the language. ' + KEEP,
  friendly: 'Rewrite the user\'s text so it sounds noticeably warmer and friendlier: natural, kind and upbeat, like a message to someone you like. Don\'t add emoji unless the text already has some. Fix any mistakes. Keep the language and every point. ' + KEEP,
  pro: 'Rewrite the user\'s text so it sounds professional, confident and polite, suitable for work email. Fix any mistakes. Keep the language. ' + KEEP,
  translate: 'Translate the user\'s text into {lang}. Sound natural, as a native speaker would write it. ' + KEEP,
  ask: 'Edit the user\'s text by following this instruction: "{extra}". Keep the language unless the instruction says otherwise. ' + KEEP,
};

const LANGS = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch', 'Polish', 'Lithuanian', 'Ukrainian', 'Russian', 'Turkish', 'Arabic', 'Hindi', 'Chinese (Simplified)', 'Japanese', 'Korean', 'Thai', 'Vietnamese', 'Indonesian'];

function prompt(mode, text, extra = '') {
  const tpl = MODES[mode] || MODES.fix;
  const system = tpl.replace('{lang}', extra || 'English').replace('{extra}', String(extra).replace(/"/g, "'").slice(0, 300));
  return { system, user: text };
}

module.exports = { prompt, MODES, LANGS };

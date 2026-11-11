// WRITESHAPER_DEMO=1: a stand-in engine with made-up answers, for screenshots and tests without a model.
const SAMPLES = {
  fix: (t) => t
    .replace(/\bi\b/g, 'I').replace(/\bu\b/g, 'you').replace(/wont/g, "won't").replace(/tommorow/g, 'tomorrow')
    .replace(/becuase/g, 'because').replace(/we has/g, 'we have').replace(/appoinment/g, 'appointment')
    .replace(/reschedual/g, 'reschedule').replace(/\bTheir going\b/g, "They're going").replace(/\bits been\b/g, "it's been")
    .replace(/proces\b/g, 'process').replace(/everyone done there/g, 'everyone has done their').replace(/\bhey john\b/gi, 'Hey John')
    .replace(/me and sarah/g, 'Sarah and I').replace(/, can we/g, '. Can we').replace(/recieve/g, 'receive').replace(/definately/g, 'definitely')
    .replace(/alot/g, 'a lot').replace(/\bteh\b/g, 'the').replace(/seperate/g, 'separate').replace(/occured/g, 'occurred'),
  pro: () => 'Hi John, I wanted to let you know that Sarah and I will be unable to attend tomorrow’s meeting due to a dental appointment. Would it be possible to reschedule for Thursday?',
  short: () => 'Hi John, Sarah and I can’t make tomorrow’s meeting (dentist). Could we move it to Thursday?',
  friendly: () => 'Hey John! Sorry, Sarah and I can’t make it tomorrow — we’ve got a dentist appointment. Could we do Thursday instead?',
  clear: () => 'Hi John, Sarah and I can’t come to tomorrow’s meeting because we have a dentist appointment. Can we move it to Thursday?',
  translate: () => 'Hola John, quería avisarte de que Sarah y yo no podremos ir a la reunión de mañana porque tenemos cita con el dentista. ¿Podemos pasarla al jueves?',
  ask: () => '- Sarah and I can’t make tomorrow’s meeting\n- Reason: dentist appointment\n- Suggestion: move it to Thursday',
};
let up = false;
const engine = {
  async start() { await new Promise((r) => setTimeout(r, 400)); up = true; },
  stop() { up = false; },
  running: () => up,
  rewrite({ mode, text }, onText) {
    const out = (SAMPLES[mode] || SAMPLES.fix)(text);
    let stop = false;
    const done = (async () => {
      for (let i = 0; i <= out.length; i += 3) {
        if (stop) { const e = new Error('stopped'); e.name = 'AbortError'; throw e; }
        onText(out.slice(0, i));
        await new Promise((r) => setTimeout(r, 14));
      }
      return out;
    })();
    return { done, cancel: () => { stop = true; } };
  },
};
const models = () => [
  { id: 'standard', name: 'Standard', size: 1949047968, installed: true, downloading: false, partial: 0 },
  { id: 'best', name: 'Best', size: 2740937888, installed: false, downloading: false, partial: 0 },
];
const SELECTION = 'hey john, i wanted to let u know that me and sarah wont be able to make it to the meeting tommorow becuase we has a dentist appoinment, can we reschedual for thursday?';
module.exports = { engine, models, SELECTION };

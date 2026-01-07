// We use hosted MP3s for reliability
const sounds = {
  chip: new Audio('https://www.soundjay.com/misc/sounds/coin-drop-1.mp3'),
  deal: new Audio('https://www.soundjay.com/card/sounds/card-flip-1.mp3'),
  win: new Audio('https://www.soundjay.com/human/sounds/applause-01.mp3'),
  fold: new Audio('https://www.soundjay.com/card/sounds/card-shuffling-1.mp3')
};

export const playSound = (type) => {
  const audio = sounds[type];
  if (audio) {
    audio.currentTime = 0; // Reset to start
    audio.play().catch(e => console.log("Audio play failed (interaction needed first)"));
  }
};
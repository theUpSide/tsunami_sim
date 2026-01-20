export interface TsunamiFact {
  phase: SimulationPhase;
  text: string;
}

export type SimulationPhase =
  | 'idle'
  | 'earthquake'
  | 'waveFormation'
  | 'waveTravel'
  | 'waveShoaling'
  | 'waveBreaking'
  | 'inundation'
  | 'aftermath';

export const tsunamiFacts: TsunamiFact[] = [
  {
    phase: 'earthquake',
    text: 'Tsunamis are caused by underwater earthquakes that displace massive amounts of water. The earthquake pushes the ocean floor up or down, displacing billions of tons of water.',
  },
  {
    phase: 'earthquake',
    text: 'About 80% of tsunamis occur in the Pacific Ocean\'s "Ring of Fire," where tectonic plates frequently collide.',
  },
  {
    phase: 'waveFormation',
    text: 'In deep ocean, tsunami waves can travel at over 500 mph (800 km/h) - as fast as a jet airplane! But they\'re only 1-2 feet tall.',
  },
  {
    phase: 'waveFormation',
    text: 'The word "tsunami" comes from Japanese: "tsu" (harbor) and "nami" (wave). They were historically called "harbor waves."',
  },
  {
    phase: 'waveTravel',
    text: 'A tsunami can cross the entire Pacific Ocean in less than 24 hours. The 2011 Japan tsunami reached the US West Coast in about 10 hours.',
  },
  {
    phase: 'waveTravel',
    text: 'Unlike regular waves caused by wind, tsunamis involve the entire water column from surface to seafloor, carrying enormous energy.',
  },
  {
    phase: 'waveShoaling',
    text: 'As tsunamis reach shallow coastal waters, they slow dramatically from 500+ mph to around 20-30 mph, but their height can increase from 1-2 feet to over 100 feet!',
  },
  {
    phase: 'waveShoaling',
    text: 'The phenomenon of waves growing taller in shallow water is called "shoaling." The wave\'s energy is compressed into a smaller volume of water.',
  },
  {
    phase: 'waveBreaking',
    text: 'The first wave is often NOT the largest! Tsunamis come in a series of waves called a "wave train" that can arrive over several hours.',
  },
  {
    phase: 'waveBreaking',
    text: 'Before a tsunami hits, the ocean sometimes recedes dramatically, exposing the seafloor. This is a critical warning sign to move to higher ground immediately.',
  },
  {
    phase: 'inundation',
    text: 'Tsunami waves can travel inland at 30+ mph and push water up to several miles from the coast. The force of the water can demolish buildings and sweep away everything in its path.',
  },
  {
    phase: 'inundation',
    text: 'The 2004 Indian Ocean tsunami killed over 230,000 people across 14 countries, making it one of the deadliest natural disasters in recorded history.',
  },
  {
    phase: 'aftermath',
    text: 'Tsunami warning systems can now detect earthquakes and predict tsunami arrival times, giving coastal communities precious minutes to hours to evacuate.',
  },
  {
    phase: 'aftermath',
    text: 'If you feel a strong earthquake near the coast, don\'t wait for official warnings - move to high ground immediately. Natural warnings can save your life.',
  },
];

export function getFactsForPhase(phase: SimulationPhase): TsunamiFact[] {
  return tsunamiFacts.filter((fact) => fact.phase === phase);
}

export function getRandomFactForPhase(phase: SimulationPhase): TsunamiFact | null {
  const facts = getFactsForPhase(phase);
  if (facts.length === 0) return null;
  return facts[Math.floor(Math.random() * facts.length)];
}

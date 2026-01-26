
export type SectionType = 'standard' | 'mandatory' | 'prohibited' | 'step' | 'success';

export interface ScriptSection {
  id: string;
  title: string;
  content: string;
  type: SectionType;
  imageUrl?: string;
  audioUrl?: string;
  copyable?: boolean;
}

export interface ScriptCategory {
  id: string;
  title: string;
  sections: ScriptSection[];
}

export const INITIAL_SCRIPTS: ScriptCategory[] = [
  {
    id: 'greeting',
    title: 'Muloqotni boshlash',
    sections: [
      {
        id: 's1',
        title: '1. Salomlashuv (Standart)',
        content: 'Assalomu alaykum. Eddo yetkazib berish xizmati. Men operator [Ism]. Qanday yordam bera olaman?',
        type: 'standard',
        copyable: true,
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' // Placeholder
      },
      {
        id: 's2',
        title: '3. Majburiy Takliflar',
        content: 'Ichimlik qo\'shamizmi? Kartoshka fri yoki sous tavsiya qilaman.',
        type: 'mandatory',
        imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1000&auto=format&fit=crop'
      }
    ]
  },
  {
    id: 'conflict',
    title: 'Muammolar (L.A.S.T)',
    sections: [
      {
        id: 'c1',
        title: 'Qat\'iyan Taqiqlangan!',
        content: '• Bu bizga bog\'liq emas\n• Bilmayman\n• Tizim ishlamayabdi',
        type: 'prohibited'
      }
    ]
  }
];

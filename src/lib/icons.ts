'use client'

import type { ElementType } from 'react'
import {
  BookOpen,
  Brain,
  Camera,
  Code,
  Coffee,
  Crown,
  Drama,
  Dumbbell,
  Film,
  Gamepad2,
  Globe,
  Heart,
  Languages,
  Laptop,
  Leaf,
  Lightbulb,
  MessageCircle,
  Mic,
  Music,
  Newspaper,
  Palette,
  PenLine,
  Rocket,
  Sparkles,
  Star,
  Users,
  UtensilsCrossed,
} from 'lucide-react'

export interface IconChoice {
  name: string
  label: string
  Icon: ElementType
}

/* Icon palette offered in the club editor. The chosen icon renders on the
   calendar chip in place of the old colored dot. */
export const CLUB_ICONS: IconChoice[] = [
  { name: 'chess', label: 'Chess', Icon: Crown },
  { name: 'music', label: 'Music', Icon: Music },
  { name: 'book', label: 'Book club', Icon: BookOpen },
  { name: 'film', label: 'Film', Icon: Film },
  { name: 'mic', label: 'Public speaking', Icon: Mic },
  { name: 'art', label: 'Art', Icon: Palette },
  { name: 'code', label: 'Coding', Icon: Code },
  { name: 'game', label: 'Games', Icon: Gamepad2 },
  { name: 'pen', label: 'Writing', Icon: PenLine },
  { name: 'star', label: 'Star', Icon: Star },
  { name: 'calendar', label: 'Calendar', Icon: Sparkles },
  { name: 'globe', label: 'Culture', Icon: Globe },
  { name: 'languages', label: 'Languages', Icon: Languages },
  { name: 'theater', label: 'Theater', Icon: Drama },
  { name: 'camera', label: 'Photography', Icon: Camera },
  { name: 'sport', label: 'Sport', Icon: Dumbbell },
  { name: 'science', label: 'Science', Icon: Lightbulb },
  { name: 'debate', label: 'Debate', Icon: MessageCircle },
  { name: 'environment', label: 'Environment', Icon: Leaf },
  { name: 'community', label: 'Community', Icon: Users },
  { name: 'food', label: 'Cooking', Icon: UtensilsCrossed },
  { name: 'tech', label: 'Tech', Icon: Laptop },
  { name: 'brain', label: 'Philo', Icon: Brain },
  { name: 'rocket', label: 'Space', Icon: Rocket },
  { name: 'heart', label: 'Wellness', Icon: Heart },
  { name: 'news', label: 'Journalism', Icon: Newspaper },
  { name: 'coffee', label: 'Café', Icon: Coffee },
]

export function clubIcon(name?: string): IconChoice | null {
  if (!name) return null
  return CLUB_ICONS.find((i) => i.name === name) || null
}

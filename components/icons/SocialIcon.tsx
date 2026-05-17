import { SiInstagram, SiTiktok, SiFacebook, SiDiscord, SiSpotify, SiSoundcloud, SiThreads } from "react-icons/si";

const ICONS = {
  instagram: SiInstagram,
  tiktok: SiTiktok,
  facebook: SiFacebook,
  discord: SiDiscord,
  spotify: SiSpotify,
  soundcloud: SiSoundcloud,
  threads: SiThreads,
};

export function SocialIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name as keyof typeof ICONS];
  return Icon ? <Icon className={className} /> : null;
}

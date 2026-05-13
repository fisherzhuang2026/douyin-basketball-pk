import devilBombIcon from "./assets/gifts/devil-bomb.png";
import energyBatteryIcon from "./assets/gifts/energy-battery.png";
import energyPillIcon from "./assets/gifts/energy-pill.png";
import fairyStickIcon from "./assets/gifts/fairy-stick.png";
import lifePotionIcon from "./assets/gifts/life-potion.png";
import magicMirrorIcon from "./assets/gifts/magic-mirror.png";
import mysteryAirdropIcon from "./assets/gifts/mystery-airdrop.png";
import partyMicIcon from "./assets/gifts/party-mic.png";
import partyOutfitIcon from "./assets/gifts/party-outfit.png";
import rareChestIcon from "./assets/gifts/rare-chest.png";
import strawberryDessertIcon from "./assets/gifts/strawberry-dessert.png";
import superAirdropIcon from "./assets/gifts/super-airdrop.png";
import superJetIcon from "./assets/gifts/super-jet.png";
import sweetDonutIcon from "./assets/gifts/sweet-donut.png";

export interface GiftIconAsset {
  textureKey: string;
  url: string;
}

export const GIFT_ICON_ASSETS: Record<string, GiftIconAsset> = {
  fairy_stick: { textureKey: "gift-icon-fairy-stick", url: fairyStickIcon },
  yellow_fairy_stick: { textureKey: "gift-icon-yellow-fairy-stick", url: fairyStickIcon },
  blue_fairy_stick: { textureKey: "gift-icon-blue-fairy-stick", url: fairyStickIcon },
  green_fairy_stick: { textureKey: "gift-icon-green-fairy-stick", url: fairyStickIcon },
  purple_fairy_stick: { textureKey: "gift-icon-purple-fairy-stick", url: fairyStickIcon },
  energy_pill: { textureKey: "gift-icon-energy-pill", url: energyPillIcon },
  magic_mirror: { textureKey: "gift-icon-magic-mirror", url: magicMirrorIcon },
  donut: { textureKey: "gift-icon-sweet-donut", url: sweetDonutIcon },
  energy_battery: { textureKey: "gift-icon-energy-battery", url: energyBatteryIcon },
  love_blast: { textureKey: "gift-icon-devil-bomb", url: devilBombIcon },
  party_mic: { textureKey: "gift-icon-party-mic", url: partyMicIcon },
  mystery_airdrop: { textureKey: "gift-icon-mystery-airdrop", url: mysteryAirdropIcon },
  strawberry_dessert: { textureKey: "gift-icon-strawberry-dessert", url: strawberryDessertIcon },
  super_airdrop: { textureKey: "gift-icon-super-airdrop", url: superAirdropIcon },
  life_potion: { textureKey: "gift-icon-life-potion", url: lifePotionIcon },
  super_jet: { textureKey: "gift-icon-super-jet", url: superJetIcon },
  rare_chest: { textureKey: "gift-icon-rare-chest", url: rareChestIcon },
  party_outfit: { textureKey: "gift-icon-party-outfit", url: partyOutfitIcon }
};

export function getGiftIconAsset(giftKey?: string): GiftIconAsset | undefined {
  return giftKey ? GIFT_ICON_ASSETS[giftKey] : undefined;
}

export function getAllGiftIconAssets(): GiftIconAsset[] {
  return Object.values(GIFT_ICON_ASSETS);
}

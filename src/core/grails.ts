// The Finds shelf: 40 fixed grails. Every grail tier item in the game is one of
// these, so the shelf fills in as you find them. Names are invented.

import type { Category } from './items.ts'

export interface Grail {
  id: number
  name: string
  category: Category
  artSeed: number
  palette: number
}

const list: Array<[string, Category]> = [
  ['Vexon Pocketbeam Prototype', 'handheld'],
  ['Zentro Glowdeck Gold', 'handheld'],
  ['Tarbo Pixelpal Signature', 'handheld'],
  ['Quillix Bleepbox Zero', 'handheld'],
  ['Mondara Palmquest Crystal', 'handheld'],
  ["Blorp's Big Day Unreleased", 'cartridge'],
  ['Fizzbert Forever Gold Label', 'cartridge'],
  ['Sir Pickle at the Seaside Promo', 'cartridge'],
  ['Zazzle Underground Test Build', 'cartridge'],
  ['Captain Crumb Strikes Back Sealed', 'cartridge'],
  ['Orvex Clankster Mark One', 'robot'],
  ['Kablox Zoomtron Chrome', 'robot'],
  ['Dorlak Tinhead Tim Original', 'robot'],
  ['Haxley Sparkbot Showroom', 'robot'],
  ['Pintoro Bolthead Giant', 'robot'],
  ['Fennwick Mushroom Lamp Ruby', 'lamp'],
  ['Brizzo Jellyfish Lamp Studio', 'lamp'],
  ['Yondell Lighthouse Lamp First Run', 'lamp'],
  ['Trimbo Comet Lamp Blue', 'lamp'],
  ['Ocelco Pagoda Lamp Jade', 'lamp'],
  ['Midnight Soup by The Velvet Owls Acetate', 'record'],
  ['Live at the Laundromat Signed', 'record'],
  ['Copper Moon by Tin Comet Misprint', 'record'],
  ['Secret Biscuits Picture Disc', 'record'],
  ['Goodnight Tractor by Harbor Dogs Gold', 'record'],
  ['Wambler Twinlens Chrome', 'camera'],
  ['Grindle Reflexa Titanium', 'camera'],
  ['Sablo Panomatic Press', 'camera'],
  ['Nurrix Snapjack Olive', 'camera'],
  ['Jettro Boxcamera Centenary', 'camera'],
  ['Kipple Navigator Moon Edition', 'watch'],
  ['Marzon Diver 500 Deep Blue', 'watch'],
  ['Tobbly Moonphase Platinum', 'watch'],
  ['Velmar Harbormaster Brass', 'watch'],
  ['Rundo Clockwork Skeleton', 'watch'],
  ['Cows Considering Rain by Mirabel Tosk', 'painting'],
  ['The Mayor Asleep by Ulf Grimsby', 'painting'],
  ['Night Ferry by Ottoline Brask', 'painting'],
  ['Tea for the Keeper by P. Grundle', 'painting'],
  ['Six Onions by Hattie Rook', 'painting'],
]

export const GRAILS: readonly Grail[] = list.map(([name, category], id) => ({
  id,
  name,
  category,
  // Fixed art so the same grail always looks the same on the shelf.
  artSeed: (id * 2654435761) >>> 0,
  palette: id % 8,
}))

export const GRAIL_COUNT = GRAILS.length

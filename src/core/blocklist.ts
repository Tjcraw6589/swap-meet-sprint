// Real brand, product, character and title names that must never appear in a
// generated name. Matched case insensitively on whole words or whole phrases.

export const BLOCKLIST: readonly string[] = [
  // console and game makers
  'nintendo', 'sega', 'sony', 'atari', 'microsoft', 'xbox', 'playstation', 'wii',
  'game boy', 'gameboy', 'game gear', 'gamegear', 'ds lite', 'switch lite', 'nes', 'snes',
  'genesis', 'mega drive', 'megadrive', 'dreamcast', 'saturn', 'neo geo', 'neogeo',
  'lynx', 'jaguar', 'vectrex', 'wonderswan', 'n gage', 'ngage', 'virtual boy',
  'intellivision', 'colecovision', 'coleco', 'commodore', 'amiga', 'spectrum', 'amstrad',
  'turbografx', 'pc engine', 'tiger', 'tamagotchi', 'furby', 'nokia', 'apple', 'samsung',
  'playdate', 'steam deck', 'ouya', 'evercade', 'analogue', 'pokemon', 'pokémon',
  // game titles and characters
  'mario', 'luigi', 'zelda', 'link', 'metroid', 'kirby', 'donkey kong', 'sonic', 'tails',
  'pac man', 'pacman', 'tetris', 'pikachu', 'bomberman', 'mega man', 'megaman',
  'castlevania', 'final fantasy', 'dragon quest', 'street fighter', 'mortal kombat',
  'contra', 'galaga', 'frogger', 'pitfall', 'earthbound', 'minecraft', 'fortnite', 'roblox',
  'moon patrol', 'space invaders', 'asteroids', 'centipede', 'dig dug', 'q bert', 'qbert',
  'dizzy', 'lemmings', 'doom', 'halo', 'pong', 'simon', 'yoshi', 'wario', 'ratchet', 'crash bandicoot',
  // toys and robots
  'lego', 'barbie', 'hot wheels', 'matchbox', 'transformers', 'optimus', 'gundam', 'robosapien',
  'omnibot', 'tomy', 'bandai', 'hasbro', 'mattel', 'tonka', 'fisher price', 'playmobil',
  'gizmo', 'cogsworth', 'wall e', 'r2d2', 'r2 d2', 'c3po', 'bender', 'robby', 'rosie', 'astro boy',
  'meccano', 'erector', 'nerf', 'view master', 'viewmaster', 'etch a sketch', 'rubik', 'beanie',
  // lamps and homeware
  'lava lamp', 'lava lite', 'tiffany', 'ikea', 'anglepoise', 'pixar', 'luxo', 'artemide', 'flos',
  // music and labels
  'beatles', 'elvis', 'motown', 'columbia', 'capitol', 'atlantic', 'decca', 'emi', 'rca',
  'parlophone', 'island records', 'sun records', 'stax', 'def jam', 'nirvana', 'queen',
  'abba', 'prince', 'madonna', 'bowie', 'beyonce', 'taylor swift', 'pink floyd', 'velvet underground',
  'tin machine', 'the smiths', 'the who', 'the cure', 'ramones', 'blondie', 'kraftwerk', 'metallica',
  // cameras
  'leica', 'canon', 'nikon', 'kodak', 'polaroid', 'fuji', 'fujifilm', 'instax', 'olympus',
  'pentax', 'minolta', 'hasselblad', 'rollei', 'rolleiflex', 'yashica', 'contax', 'zeiss',
  'instamatic', 'brownie', 'holga', 'lomo', 'lomography', 'minilux', 'gopro', 'ricoh', 'konica',
  'agfa', 'ilford', 'mamiya', 'bronica', 'argus', 'voigtlander', 'praktica', 'zenit',
  // watches
  'rolex', 'omega', 'seiko', 'casio', 'timex', 'swatch', 'citizen', 'tissot', 'breitling',
  'tag heuer', 'heuer', 'patek', 'cartier', 'bulova', 'fossil', 'garmin', 'fitbit', 'longines',
  'submariner', 'explorer', 'speedmaster', 'seamaster', 'navitimer', 'datejust', 'daytona',
  'monaco', 'carrera', 'g shock', 'gshock', 'royal oak', 'nautilus', 'oyster', 'hamilton',
  'zenith', 'tudor', 'oris', 'orient', 'invicta', 'swiss army', 'victorinox',
  // artists
  'picasso', 'monet', 'warhol', 'banksy', 'van gogh', 'rembrandt', 'vermeer', 'dali', 'kahlo',
  'hockney', 'pollock', 'rothko', 'klimt', 'matisse', 'hopper', 'basquiat', 'bob ross', 'kinkade',
  // general brands
  'disney', 'marvel', 'star wars', 'coca cola', 'coke', 'pepsi', 'nike', 'adidas', 'google',
  'amazon', 'zippo', 'sharpie', 'kleenex', 'band aid', 'velcro', 'jacuzzi', 'frisbee', 'thermos',
  'walkman', 'discman', 'ipod', 'iphone', 'tivo', 'super soaker', 'slinky',
]

const patterns: RegExp[] = BLOCKLIST.map((entry) => {
  const escaped = entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, 'i')
})

/** Returns the first blocked entry found in the text, or null when clean. */
export function findBlocked(text: string): string | null {
  const t = text.toLowerCase()
  for (let i = 0; i < patterns.length; i++) {
    if (patterns[i].test(t)) return BLOCKLIST[i]
  }
  return null
}

export function isClean(text: string): boolean {
  return findBlocked(text) === null
}

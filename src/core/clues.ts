// Clue phrasings. Chips are short labels. Seller lines are speech bubbles.
// At least 12 phrasings for every trait value. No hyphens anywhere.

export type TraitValue = 'broken' | 'worn' | 'clean' | 'mint' | 'real' | 'fake' | 'boxed' | 'unboxed'

export const CHIP_TEXT: Record<TraitValue, readonly string[]> = {
  broken: [
    'Does not work', 'Cracked shell', 'Dead on arrival', 'Missing parts', 'Snapped hinge',
    'No power', 'Smashed screen', 'Rattles inside', 'Bent frame', 'Burnt out', 'Parts only',
    'Will not switch on', 'Chipped and dead', 'Wires hanging out',
  ],
  worn: [
    'Scuffed', 'Scratched up', 'Faded colours', 'Sticky buttons', 'Well used', 'Dented corner',
    'Yellowed', 'Worn edges', 'Loose knob', 'Grubby', 'Sun bleached', 'Tired but works',
    'Rubbed paint', 'Shows its age',
  ],
  clean: [
    'Works fine', 'Light wear', 'Tidy', 'Gently used', 'Good shape', 'Nice and clean',
    'Fully working', 'Small marks only', 'Cared for', 'Looked after', 'Solid', 'Nothing missing',
    'Honest wear', 'Tested today',
  ],
  mint: [
    'Like new', 'Spotless', 'Never used', 'Still shiny', 'Perfect', 'Museum grade', 'Not a mark',
    'Factory fresh', 'Untouched', 'Gleaming', 'Flawless', 'Pristine', 'Top condition', 'Sticker still on',
  ],
  real: [
    'Serial matches', 'Genuine', 'Makers stamp', 'Papers included', 'Verified', 'The real thing',
    'Authentic', 'Original parts', 'Proper markings', 'Checks out', 'Legit', 'Hallmarked', 'Correct badge',
    'Right weight',
  ],
  fake: [
    'Knock off', 'Serial missing', 'Odd font on label', 'Replica', 'Copy', 'Glue marks',
    'Wrong screws', 'Bootleg', 'Logo misspelt', 'Too light', 'Reproduction', 'Counterfeit',
    'Painted on badge', 'Suspicious seams',
  ],
  boxed: [
    'Original box', 'Boxed', 'In the box', 'Box and manual', 'Sealed box', 'Comes boxed',
    'Box included', 'With packaging', 'Full set in box', 'Box a bit tatty', 'Still in packaging',
    'Boxed with inserts', 'Box and papers', 'Complete in box',
  ],
  unboxed: [
    'No box', 'Loose', 'Unboxed', 'Box missing', 'Just the item', 'No packaging', 'Bare',
    'Box long gone', 'Loose item', 'Without box', 'No case or box', 'Missing its box', 'Sold loose',
    'Item only',
  ],
}

export const SELLER_TEXT: Record<TraitValue, readonly string[]> = {
  broken: [
    'It needs a little fixing.', 'Stopped working last week.', 'Just needs new batteries. Maybe.',
    'My cousin dropped it.', 'Parts only, between us.', 'It did work once.', 'The screen went funny.',
    'A bit of glue and it is fine.', 'Honestly, it is dead.', 'It makes a sad noise.',
    'Something rattles inside.', 'Do not switch it on.', 'It is more of an ornament now.',
  ],
  worn: [
    'It has had a good life.', 'A few scratches, nothing bad.', 'Bit scuffed, still works.',
    'Kids played with it a lot.', 'Colours have faded a touch.', 'Well loved, you know.',
    'The buttons stick a bit.', 'It lived in a shed.', 'Some wear, as you would expect.',
    'Dented corner, that is all.', 'Been in the sun too long.', 'Used but honest.', 'Tired but it goes.',
  ],
  clean: [
    'Works a treat.', 'Hardly a mark on it.', 'Kept it in a drawer.', 'Looked after, this one.',
    'Nothing wrong with it.', 'Works fine, I checked.', 'Clean as a whistle.', 'Good shape for its age.',
    'Nice example, that.', 'Light use only.', 'Nothing missing.', 'Solid little thing.', 'Tested this morning.',
  ],
  mint: [
    'Never been used.', 'Still has the sticker on.', 'Box fresh, this.', 'Not a mark anywhere.',
    'Perfect, I promise.', 'Spotless, look at it.', 'My gran never opened it.', 'Like it left the shop.',
    'Untouched since new.', 'It gleams, does it not?', 'Flawless, honestly.', 'Museum piece, this.',
    'Factory fresh.',
  ],
  real: [
    'That is the genuine article.', 'Serial number is all there.', 'My uncle bought it new.',
    'Papers in the box, somewhere.', 'Real as they come.', 'Got it from the maker.',
    'Proper markings, see.', 'Original, no question.', 'Legit, hand on heart.', 'The stamp is right there.',
    'No copies here, friend.', 'Authentic, cross my heart.', 'Came with a receipt once.',
  ],
  fake: [
    'Well, it is a tribute piece.', 'Might be a copy, might not.', 'Someone said replica. Rude.',
    'The logo is a bit off.', 'It is a homage, sort of.', 'Not sure it is the real one.',
    'Could be a repro.', 'Made in a garage, I think.', 'The label spelling is odd.',
    'A copy, but a nice copy.', 'Bootleg, but it works.', 'Feels a bit light to me.', 'The badge is painted on.',
  ],
  boxed: [
    'Got the box too.', 'Box and all the bits.', 'Still in its box.', 'Original packaging, see.',
    'Comes with the box.', 'Box is a bit bashed.', 'Manual is in the box.', 'Boxed, as you can see.',
    'Full set, box included.', 'Never left the box.', 'Box, inserts, the lot.', 'Sealed, more or less.',
    'Packaging is all there.',
  ],
  unboxed: [
    'Lost the box years ago.', 'No box, sorry.', 'Just the item itself.', 'Box went in the recycling.',
    'Loose, as you see.', 'Never had a box.', 'Box? What box?', 'Comes bare.', 'The dog ate the box.',
    'No packaging, I am afraid.', 'Box is long gone.', 'Sold loose.', 'Just this, nothing else.',
  ],
}

export const TRAIT_VALUES: readonly TraitValue[] = ['broken', 'worn', 'clean', 'mint', 'real', 'fake', 'boxed', 'unboxed']

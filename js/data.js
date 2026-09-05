// Value model: ten bipolar dimensions, five items each.
// Pole A scores positive, pole B negative. Keyed "+" items agree with pole A,
// "-" items agree with pole B and are reverse-scored.
// All user-facing strings live here so the model can be translated in one place.

var DIMENSIONS = [
  {
    id: "solidarity",
    poles: ["Solidarity", "Self-reliance"],
    describe: [
      "collective responsibility for the vulnerable and narrowing the gap between rich and poor",
      "personal responsibility for one's own circumstances and accepting unequal outcomes"
    ],
    blurb: "Collective responsibility vs. individual responsibility"
  },
  {
    id: "regulation",
    poles: ["Regulation", "Market"],
    describe: [
      "government steering the economy and keeping essential services out of the profit motive",
      "free competition and minimal government involvement in the economy"
    ],
    blurb: "Government steering vs. free markets"
  },
  {
    id: "liberty",
    poles: ["Liberty", "Security"],
    describe: [
      "personal freedom and privacy, even at some cost to safety and order",
      "public safety and order, even at some cost to personal freedom"
    ],
    blurb: "Personal freedom vs. public order"
  },
  {
    id: "tradition",
    poles: ["Tradition", "Progress"],
    describe: [
      "preserving established customs, family structures and moral norms",
      "updating social values and changing traditions that exclude people"
    ],
    blurb: "Preserving customs vs. embracing social change"
  },
  {
    id: "institutions",
    poles: ["Institutions", "Popular will"],
    describe: [
      "trusting experts, courts and established political process",
      "trusting ordinary people's judgement over experts and established elites"
    ],
    blurb: "Trust in institutions vs. the voice of the people"
  },
  {
    id: "cosmopolitan",
    poles: ["Cosmopolitan", "National"],
    describe: [
      "obligations to people everywhere, openness to immigration and international cooperation",
      "putting one's own country and citizens first and expecting newcomers to adapt"
    ],
    blurb: "Global obligations vs. national priority"
  },
  {
    id: "environment",
    poles: ["Environment", "Growth"],
    describe: [
      "protecting the environment and future generations even at economic cost",
      "prioritising jobs and economic growth over environmental rules"
    ],
    blurb: "Ecological protection vs. prosperity first"
  },
  {
    id: "diplomacy",
    poles: ["Diplomacy", "Strength"],
    describe: [
      "negotiation, restraint and low military spending",
      "military strength and a willingness to use force when needed"
    ],
    blurb: "Negotiation and restraint vs. military strength"
  },
  {
    id: "local",
    poles: ["Local", "Central"],
    describe: [
      "decisions made close to the people affected, with room for regional differences",
      "strong central government to guarantee equal treatment everywhere"
    ],
    blurb: "Local decision-making vs. central government"
  },
  {
    id: "change",
    poles: ["Bold change", "Caution"],
    describe: [
      "bold, fundamental change even at the risk of disruption",
      "gradual, step-by-step reform that avoids upheaval"
    ],
    blurb: "Fundamental change vs. gradual reform"
  },
  {
    id: "animals",
    poles: ["Animal welfare", "Human use"],
    describe: [
      "animals' own interests limiting how we farm, hunt, test and use them, even at economic cost",
      "animals as resources managed for human benefit, with welfare rules kept practical for producers"
    ],
    blurb: "Animals' interests vs. animals as resources"
  },
  {
    id: "drugs",
    poles: ["Harm reduction", "Prohibition"],
    describe: [
      "treating drug use as a health matter, with regulated access, treatment, and medical use approved as the evidence arrives",
      "keeping drugs illegal and enforcing the law to deter use"
    ],
    blurb: "Drugs as a health issue vs. drugs as a crime"
  }
];

var ITEMS = [
  // 1 Solidarity <-> Self-reliance
  { id: "sol1", dim: "solidarity", key: 1,  text: "Society has a duty to guarantee everyone a decent standard of living, regardless of how they got into hardship." },
  { id: "sol2", dim: "solidarity", key: 1,  text: "Large gaps between rich and poor are harmful even when everyone's basic needs are met." },
  { id: "sol3", dim: "solidarity", key: 1,  text: "Those who earn more should contribute a much larger share to support public services." },
  { id: "sol4", dim: "solidarity", key: -1, text: "People are mostly responsible for their own success or failure in life." },
  { id: "sol5", dim: "solidarity", key: -1, text: "Generous welfare systems make people less willing to work." },

  // 2 Regulation <-> Market
  { id: "reg1", dim: "regulation", key: 1,  text: "Government should set firm rules for businesses to protect workers, consumers and the public." },
  { id: "reg2", dim: "regulation", key: 1,  text: "Essential services like water, energy and healthcare should not be run for profit." },
  { id: "reg3", dim: "regulation", key: 1,  text: "The state should step in when markets produce unfair outcomes." },
  { id: "reg4", dim: "regulation", key: -1, text: "Free competition delivers better results than government planning." },
  { id: "reg5", dim: "regulation", key: -1, text: "The economy works best when government keeps its involvement to a minimum." },

  // 3 Liberty <-> Security
  { id: "lib1", dim: "liberty", key: 1,  text: "People should be free to make choices about their own lives even when others find those choices risky or offensive." },
  { id: "lib2", dim: "liberty", key: 1,  text: "Government surveillance is dangerous even when it is meant to keep us safe." },
  { id: "lib3", dim: "liberty", key: 1,  text: "Protecting individual rights matters more than preventing every possible harm." },
  { id: "lib4", dim: "liberty", key: -1, text: "It is acceptable to limit some freedoms in order to keep society safe and orderly." },
  { id: "lib5", dim: "liberty", key: -1, text: "Police and courts should have strong powers to deal firmly with crime." },

  // 4 Tradition <-> Progress
  { id: "tra1", dim: "tradition", key: 1,  text: "Long-standing customs and institutions deserve respect because they have stood the test of time." },
  { id: "tra2", dim: "tradition", key: 1,  text: "Traditional family structures are the foundation of a healthy society." },
  { id: "tra3", dim: "tradition", key: 1,  text: "Moral standards from earlier generations are worth preserving." },
  { id: "tra4", dim: "tradition", key: -1, text: "Society should keep updating its values as our understanding of the world changes." },
  { id: "tra5", dim: "tradition", key: -1, text: "Traditions that exclude or restrict people should be changed, even if many cherish them." },

  // 5 Institutions <-> Popular will
  { id: "ins1", dim: "institutions", key: 1,  text: "Complex decisions are best left to qualified experts and established institutions." },
  { id: "ins2", dim: "institutions", key: 1,  text: "Courts and independent bodies should be able to overrule popular decisions that violate basic rights." },
  { id: "ins3", dim: "institutions", key: 1,  text: "Politics works best through compromise between established parties and institutions." },
  { id: "ins4", dim: "institutions", key: -1, text: "Ordinary people's common sense is a better guide than the opinions of experts and elites." },
  { id: "ins5", dim: "institutions", key: -1, text: "Most politicians and officials are out of touch with the concerns of ordinary people." },

  // 6 Cosmopolitan <-> National
  { id: "cos1", dim: "cosmopolitan", key: 1,  text: "We have as much obligation to people in other countries as to people in our own." },
  { id: "cos2", dim: "cosmopolitan", key: 1,  text: "Immigration enriches a society culturally and economically." },
  { id: "cos3", dim: "cosmopolitan", key: 1,  text: "International cooperation should take priority over national interest when they conflict." },
  { id: "cos4", dim: "cosmopolitan", key: -1, text: "A country should put its own citizens first, before helping people elsewhere." },
  { id: "cos5", dim: "cosmopolitan", key: -1, text: "Newcomers should adopt the customs and values of the country they move to." },

  // 7 Environment <-> Growth
  { id: "env1", dim: "environment", key: 1,  text: "Protecting the environment should take priority even when it slows economic growth." },
  { id: "env2", dim: "environment", key: 1,  text: "We should accept significant changes to how we live in order to address climate change." },
  { id: "env3", dim: "environment", key: 1,  text: "The interests of future generations should weigh heavily in today's decisions." },
  { id: "env4", dim: "environment", key: -1, text: "Economic growth and jobs matter more than environmental concerns." },
  { id: "env5", dim: "environment", key: -1, text: "Environmental rules often go too far and hurt ordinary people." },

  // 8 Diplomacy <-> Strength
  { id: "dip1", dim: "diplomacy", key: 1,  text: "Conflicts between countries are best resolved through negotiation, even when it is slow." },
  { id: "dip2", dim: "diplomacy", key: 1,  text: "Military spending should be kept as low as possible." },
  { id: "dip3", dim: "diplomacy", key: 1,  text: "Diplomacy and aid do more for a country's security than weapons do." },
  { id: "dip4", dim: "diplomacy", key: -1, text: "A strong military is essential to keep a country safe." },
  { id: "dip5", dim: "diplomacy", key: -1, text: "Sometimes force is necessary to defend our values and interests abroad." },

  // 9 Local <-> Central
  { id: "loc1", dim: "local", key: 1,  text: "Decisions should be made as close as possible to the people they affect." },
  { id: "loc2", dim: "local", key: 1,  text: "Local communities know their own needs better than national governments do." },
  { id: "loc3", dim: "local", key: 1,  text: "Regions should be able to do things differently from one another, even if that creates inconsistency." },
  { id: "loc4", dim: "local", key: -1, text: "A strong central government is needed to ensure everyone is treated equally." },
  { id: "loc5", dim: "local", key: -1, text: "Too much local autonomy leads to inefficiency and unfairness." },

  // 10 Bold change <-> Caution
  { id: "chg1", dim: "change", key: 1,  text: "Our biggest problems need bold, fundamental change rather than small adjustments." },
  { id: "chg2", dim: "change", key: 1,  text: "It is worth risking some disruption to fix a system that isn't working." },
  { id: "chg3", dim: "change", key: 1,  text: "The way things are done now mostly serves those who already benefit from it." },
  { id: "chg4", dim: "change", key: -1, text: "Gradual, step-by-step reform is safer than sweeping change." },
  { id: "chg5", dim: "change", key: -1, text: "Big changes usually create more problems than they solve." },

  // 11 Animal welfare <-> Human use
  { id: "ani1", dim: "animals", key: 1,  text: "Animals have interests of their own that should limit how we farm, hunt and use them." },
  { id: "ani2", dim: "animals", key: 1,  text: "Practices that cause animals to suffer should be banned even if that makes food more expensive." },
  { id: "ani3", dim: "animals", key: 1,  text: "Farmed animals deserve legal protection from cruelty as strong as the protection given to pets." },
  { id: "ani4", dim: "animals", key: -1, text: "Animal welfare rules should be kept practical so they do not burden farmers and businesses." },
  { id: "ani5", dim: "animals", key: -1, text: "People are entitled to use animals for food, sport and research, provided basic humane standards are met." },

  // 12 Harm reduction <-> Prohibition
  { id: "drg1", dim: "drugs", key: 1,  text: "Drug use should be treated as a health issue, not a crime." },
  { id: "drg2", dim: "drugs", key: 1,  text: "Adults should be able to buy cannabis legally from regulated sellers." },
  { id: "drg3", dim: "drugs", key: 1,  text: "Doctors should be able to prescribe drugs such as psilocybin or MDMA for treatment once trials show they help." },
  { id: "drg4", dim: "drugs", key: -1, text: "Keeping drugs illegal is the best way to protect young people from them." },
  { id: "drg5", dim: "drugs", key: -1, text: "Police should enforce drug laws firmly, including against possession for personal use." }
];

var SCALE = [
  { value: 1, label: "Strongly disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly agree" }
];

// How much a dimension matters to the person's vote, asked after the statements.
// The multiplier scales that dimension's weight in matching and its place in the priority order.
var IMPORTANCE = [
  { value: "low", label: "Matters less", mult: 0.5 },
  { value: "normal", label: "Matters", mult: 1 },
  { value: "high", label: "Matters a lot", mult: 1.5 }
];

if (typeof module !== "undefined") {
  module.exports = { DIMENSIONS: DIMENSIONS, ITEMS: ITEMS, SCALE: SCALE, IMPORTANCE: IMPORTANCE };
}

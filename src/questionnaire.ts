export type FrequencyOption = { value: number; label: string };
export type FoodItem = { name: string; label: string };
export type FoodGroup = { name: string; label: string; items: FoodItem[] };
export type DietPattern = { name: string; label: string; groups: FoodGroup[] };
export type EbqItem = { name: string; label: string; domain: string };

// Values already follow the corrected direction used in the final analysis:
// a higher number means more frequent intake.
export const FREQUENCY_OPTIONS: FrequencyOption[] = [
  { value: 9, label: '>= 4 times/day' },
  { value: 8, label: '2-3 times/day' },
  { value: 7, label: 'Once/day' },
  { value: 6, label: '4-6 times/week' },
  { value: 5, label: '2-3 times/week' },
  { value: 4, label: 'Once/week' },
  { value: 3, label: '1-3 times/month' },
  { value: 2, label: 'Occasionally' },
  { value: 1, label: 'Never' },
];

export const EBQ_ITEMS: EbqItem[] = [
  { name: 'ebq1', label: 'I am unable to control my urge to eat.', domain: 'Loss of control' },
  { name: 'ebq2', label: 'Eating means I do not have to think about negative things.', domain: 'Emotional eating' },
  { name: 'ebq3', label: 'Binge eating is something I can have for myself.', domain: 'Binge-eating beliefs' },
  { name: 'ebq4', label: 'Once I start eating, I cannot stop.', domain: 'Loss of control' },
  { name: 'ebq5', label: 'Eating helps control my emotions.', domain: 'Emotional eating' },
  { name: 'ebq6', label: 'I deserve to experience pleasure such as binge eating.', domain: 'Binge-eating beliefs' },
  { name: 'ebq7', label: 'I have no willpower in relation to food.', domain: 'Loss of control' },
  { name: 'ebq8', label: 'Eating keeps my emotions at a tolerable level.', domain: 'Emotional eating' },
  { name: 'ebq9', label: 'Binge eating is a good experience.', domain: 'Binge-eating beliefs' },
  { name: 'ebq10', label: 'I cannot control my eating.', domain: 'Loss of control' },
  { name: 'ebq11', label: 'Eating helps me cope with negative thoughts.', domain: 'Emotional eating' },
  { name: 'ebq12', label: 'Binge eating allows me to have something nice for myself.', domain: 'Binge-eating beliefs' },
  { name: 'ebq13', label: 'If I do not control myself, I will never stop eating.', domain: 'Loss of control' },
  { name: 'ebq14', label: 'Eating helps me cope with negative emotions.', domain: 'Emotional eating' },
  { name: 'ebq15', label: 'It will not make a difference if I eat a little more.', domain: 'Binge-eating beliefs' },
  { name: 'ebq16', label: 'There is nothing I can do to stop eating.', domain: 'Loss of control' },
  { name: 'ebq17', label: 'Eating is the best way for me to cope with unwanted feelings.', domain: 'Emotional eating' },
  { name: 'ebq18', label: 'I like to binge eat.', domain: 'Binge-eating beliefs' },
];

export const DIET_PATTERNS: DietPattern[] = [
  {
    name: 'pattern_1',
    label: 'Pattern 1: fruit, vegetable, dairy, soy and aquatic foods',
    groups: [
      {
        name: 'grp_tuber', label: 'Tubers', items: [
          { name: 'tb_potato', label: 'Potato' },
          { name: 'tb_sweet_potato', label: 'Sweet potato' },
          { name: 'tb_taro', label: 'Taro / Chinese yam' },
        ],
      },
      {
        name: 'grp_seafood', label: 'Aquatic foods', items: [
          { name: 'sf_fish', label: 'Fish' },
          { name: 'sf_shrimp_crab', label: 'Shrimp, crab or shellfish' },
          { name: 'sf_squid', label: 'Squid or cuttlefish' },
          { name: 'sf_seaweed', label: 'Kelp or seaweed' },
          { name: 'sf_other_sea', label: 'Other aquatic foods' },
        ],
      },
      {
        name: 'grp_dairy', label: 'Dairy products', items: [
          { name: 'da_fresh_milk', label: 'Fresh milk' },
          { name: 'da_yogurt', label: 'Yogurt' },
          { name: 'da_milk_powder', label: 'Milk powder' },
          { name: 'da_cheese', label: 'Cheese' },
        ],
      },
      {
        name: 'grp_soy', label: 'Soy products', items: [
          { name: 'sy_tofu', label: 'Tofu' },
          { name: 'sy_soy_milk', label: 'Soy milk' },
          { name: 'sy_dried_tofu', label: 'Dried tofu' },
          { name: 'sy_tofu_skin', label: 'Tofu skin / yuba' },
          { name: 'sy_soy_drink', label: 'Soy beverage' },
          { name: 'sy_other_soy', label: 'Other soy products' },
        ],
      },
      {
        name: 'grp_vegetable', label: 'Fresh vegetables', items: [
          { name: 'vg_leafy', label: 'Leafy vegetables' },
          { name: 'vg_cabbage', label: 'Cabbage / Chinese cabbage' },
          { name: 'vg_crucifer', label: 'Cauliflower / broccoli' },
          { name: 'vg_tomato', label: 'Tomato' },
          { name: 'vg_carrot', label: 'Carrot' },
          { name: 'vg_radish', label: 'White radish' },
          { name: 'vg_cucumber', label: 'Cucumber' },
          { name: 'vg_eggplant', label: 'Eggplant' },
          { name: 'vg_celery', label: 'Celery' },
          { name: 'vg_beans', label: 'Green beans' },
          { name: 'vg_sprouts', label: 'Bean sprouts' },
          { name: 'vg_mushroom', label: 'Mushrooms' },
          { name: 'vg_allium', label: 'Onion / garlic' },
          { name: 'vg_pepper', label: 'Green or sweet pepper' },
          { name: 'vg_corn', label: 'Corn' },
          { name: 'vg_lotus', label: 'Lotus root' },
          { name: 'vg_other', label: 'Other vegetables' },
        ],
      },
      {
        name: 'grp_fruit', label: 'Fresh fruit', items: [
          { name: 'fr_apple_pear', label: 'Apple / pear' },
          { name: 'fr_banana', label: 'Banana' },
          { name: 'fr_citrus', label: 'Orange / citrus fruit' },
          { name: 'fr_melon', label: 'Watermelon / muskmelon' },
          { name: 'fr_peach_plum', label: 'Peach / plum' },
          { name: 'fr_grape', label: 'Grapes' },
          { name: 'fr_strawberry', label: 'Strawberry' },
          { name: 'fr_kiwi', label: 'Kiwi fruit' },
          { name: 'fr_mango_pineapple', label: 'Mango / pineapple' },
          { name: 'fr_lychee_longan', label: 'Lychee / longan' },
          { name: 'fr_persimmon', label: 'Persimmon' },
          { name: 'fr_other', label: 'Other fresh fruit' },
        ],
      },
      {
        name: 'grp_dried', label: 'Dried foods', items: [
          { name: 'dr_jujube', label: 'Dried jujube / preserved fruit' },
          { name: 'dr_raisin', label: 'Raisins' },
          { name: 'dr_dried_mushroom', label: 'Dried mushrooms / wood ear' },
          { name: 'dr_dried_seafood', label: 'Dried aquatic products' },
          { name: 'dr_other_dried', label: 'Other dried foods' },
        ],
      },
    ],
  },
  {
    name: 'pattern_2',
    label: 'Pattern 2: staple foods, meat and eggs',
    groups: [
      {
        name: 'grp_staple', label: 'Staple foods', items: [
          { name: 'st_rice', label: 'Rice' },
          { name: 'st_porridge', label: 'Rice porridge / congee' },
          { name: 'st_bun', label: 'Steamed buns' },
          { name: 'st_noodle', label: 'Noodles' },
          { name: 'st_rice_noodle', label: 'Rice noodles' },
          { name: 'st_glutinous', label: 'Glutinous rice products' },
          { name: 'st_instant_noodle', label: 'Instant noodles' },
          { name: 'st_other_grain', label: 'Other grain products' },
        ],
      },
      {
        name: 'grp_egg', label: 'Eggs', items: [
          { name: 'eg_chicken_egg', label: 'Chicken eggs' },
          { name: 'eg_duck_egg', label: 'Duck, salted or preserved eggs' },
        ],
      },
      {
        name: 'grp_meat', label: 'Fresh meat', items: [
          { name: 'mt_pork', label: 'Pork' },
          { name: 'mt_beef', label: 'Beef' },
          { name: 'mt_lamb', label: 'Lamb' },
          { name: 'mt_poultry', label: 'Chicken / duck' },
          { name: 'mt_organ', label: 'Animal organs' },
        ],
      },
    ],
  },
  {
    name: 'pattern_3',
    label: 'Pattern 3: pickled or fried foods, snacks and beverages',
    groups: [
      {
        name: 'grp_pickled_fried', label: 'Pickled, smoked, grilled or fried foods', items: [
          { name: 'pf_pickled_veg', label: 'Pickled vegetables' },
          { name: 'pf_smoked', label: 'Smoked foods' },
          { name: 'pf_grilled', label: 'Grilled or barbecued foods' },
          { name: 'pf_fried', label: 'Fried flour foods' },
        ],
      },
      {
        name: 'grp_snack', label: 'Snacks and nuts', items: [
          { name: 'sn_chips', label: 'Chips / puffed snacks' },
          { name: 'sn_candy', label: 'Candy / chocolate' },
          { name: 'sn_nuts', label: 'Nuts / seeds' },
          { name: 'sn_western_pastry', label: 'Chinese pastries' },
        ],
      },
      {
        name: 'grp_beverage', label: 'Beverages', items: [
          { name: 'bv_sugary_drink', label: 'Sugar-sweetened drinks' },
          { name: 'bv_tea', label: 'Tea' },
          { name: 'bv_coffee', label: 'Coffee' },
        ],
      },
    ],
  },
];

export const FOOD_ITEMS = DIET_PATTERNS.flatMap((pattern) => pattern.groups.flatMap((group) => group.items));
export const FOOD_GROUPS = DIET_PATTERNS.flatMap((pattern) => pattern.groups);


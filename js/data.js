/* Elaichi — everything the page says lives here.
   Change a name, price or review in this file and the site updates.
   Boxes are [left, top, right, bottom] in pixels of the original 1376 x 768 scene image. */
window.ELAICHI = {
  scene: { width: 1376, height: 768 },

  boards: {
    "new": {
      title: "New this week", art: "frappe",
      note: "Two things we started making on Monday.",
      items: [
        { name: "Pistachio Rose Frappé", price: 240, natural: true,
          line: "Iced pistachio milk with rose and crushed pistachio.",
          made: ["Whole milk", "Roasted pistachio paste", "Rose syrup made in house", "Crushed pistachio", "Dried rose petals", "Ice"],
          tip: "Ask for it without ice and we steam the milk instead." },
        { name: "Elaichi Cream Bun", price: 140, natural: true, art: "bun",
          line: "A soft milk bun filled with cardamom custard.",
          made: ["Flour", "Milk and butter", "Eggs", "Cane sugar", "Green cardamom", "Vanilla custard"],
          tip: "Baked at 7 am and 3 pm. They are usually gone within the hour." }
      ]
    },
    "shakes": {
      title: "Milkshakes", art: "shake",
      note: "Blended to order with whole milk. No ice cream base, no syrups.",
      items: [
        { name: "Dark Cocoa Shake", price: 220, natural: true,
          line: "Seventy per cent cocoa, sweetened with jaggery.",
          made: ["Whole milk", "70% dark cocoa", "Jaggery", "Vanilla bean", "Cocoa nibs"],
          tip: "Not very sweet. Ask for extra jaggery if you like it sweeter." },
        { name: "Malabar Banana & Date Shake", price: 210, natural: true,
          line: "Nendran banana and dates with a little honey.",
          made: ["Whole milk", "Nendran banana", "Medjool dates", "Honey", "Cinnamon"],
          tip: "No added sugar. The dates do the work." }
      ]
    },
    "icecream": {
      title: "Ice cream", art: "icecream",
      note: "Churned in the kitchen every other day, in small tubs.",
      items: [
        { name: "Tender Coconut", price: 160, natural: true,
          line: "Coconut water and soft malai, churned with cream.",
          made: ["Tender coconut water", "Coconut malai", "Fresh cream", "Milk", "Cane sugar"],
          tip: "Two scoops in a cup or a waffle cone." },
        { name: "Jaggery Caramel", price: 170, natural: true,
          line: "Palm jaggery cooked to a caramel, with sea salt.",
          made: ["Fresh cream", "Milk", "Palm jaggery", "Butter", "Sea salt"],
          tip: "Good on its own, better next to a filter kaapi." }
      ]
    },
    "tea": {
      title: "Tea", art: "tea",
      note: "Leaves from Munnar and Assam, brewed to order.",
      items: [
        { name: "Cardamom Masala Chai", price: 120, natural: true,
          line: "Strong Assam tea simmered with milk and fresh spices.",
          made: ["Assam CTC tea", "Whole milk", "Green cardamom", "Fresh ginger", "Clove", "Jaggery"],
          tip: "Served in a steel tumbler, the way it should be." },
        { name: "Munnar Gold Iced Tea", price: 140, natural: true,
          line: "Orange pekoe over ice with lemon and mint.",
          made: ["Munnar orange pekoe", "Lemon", "Honey", "Fresh mint", "Ice"],
          tip: "Brewed cold overnight, so it is never bitter." }
      ]
    },
    "coffee": {
      title: "Coffee", art: "coffee",
      note: "Beans from small estates in Wayanad, roasted every week.",
      items: [
        { name: "Kerala Filter Kaapi", price: 130, natural: true,
          line: "Slow-dripped decoction with hot frothed milk.",
          made: ["Wayanad arabica and robusta", "A little chicory", "Hot whole milk", "Cane sugar"],
          tip: "We pour it between tumbler and davara at your table." },
        { name: "Wayanad Cold Brew", price: 190, natural: true,
          line: "Single-estate arabica steeped for eighteen hours.",
          made: ["Single-estate Wayanad arabica", "Filtered water", "Ice"],
          tip: "Black by default. Milk or jaggery syrup on request." }
      ]
    }
  },

  /* one dish per file in assets/dishes/. Drop models/<id>.glb next to it and the plate turns 3D. */
  dishes: {
    "chicken-wrap": { name: "Chicken Tikka Wrap", price: 220, veg: false, shelf: "savouries",
      line: "Char-grilled chicken tikka, peppers and mint chutney in a toasted wholewheat wrap.",
      made: "Chicken tikka, wholewheat wrap, peppers and onion, mint and coriander chutney, hung curd",
      rating: 4.7, count: 132,
      reviews: [["The tikka is smoky and the wrap stays crisp to the last bite.", "Anjali M."],
                ["My usual lunch. Ask for extra mint chutney.", "Rahul S."]] },
    "chicken-burger": { name: "Crispy Chicken Burger", price: 240, veg: false, shelf: "savouries",
      line: "Buttermilk-fried chicken with tomato, lettuce and house mayo in a sesame bun.",
      made: "Chicken thigh, buttermilk, sesame bun, tomato, lettuce, house mayo",
      rating: 4.6, count: 98,
      reviews: [["Proper crunch, soft bun, not greasy.", "Fathima N."],
                ["The house mayo makes it. I come back for this.", "Vivek P."]] },
    "paneer-sandwich": { name: "Paneer Tikka Sandwich", price: 190, veg: true, shelf: "savouries",
      line: "Tandoori paneer, peppers and green chutney between two slices of toasted bread.",
      made: "Paneer, peppers and onion, tikka spices, green chutney, toasted white bread",
      rating: 4.8, count: 121,
      reviews: [["Thick paneer, well spiced, toasted just right.", "Sneha R."],
                ["Filling enough for lunch, and it goes well with the chai.", "Arjun K."]] },
    "corn-sandwich": { name: "Corn & Spinach Sandwich", price: 170, veg: true, shelf: "savouries",
      line: "Sweet corn and creamed spinach with melted cheese on toasted bread.",
      made: "Sweet corn, spinach, cheese, butter, black pepper, toasted white bread",
      rating: 4.5, count: 76,
      reviews: [["Creamy without being heavy. My kids finish it every time.", "Divya T."],
                ["Simple and fresh.", "Joseph A."]] },
    "chocolate-truffle": { name: "Chocolate Truffle Slice", price: 190, veg: true, shelf: "cakes",
      line: "Three layers of dark chocolate sponge and ganache, dusted with cocoa.",
      made: "Dark chocolate, cocoa, fresh cream, flour, butter, cane sugar (eggless)",
      rating: 4.8, count: 164,
      reviews: [["Dense, dark and not too sweet.", "Meera K."],
                ["One slice is enough for two. We still order two.", "Nikhil V."]] },
    "red-velvet": { name: "Red Velvet Slice", price: 210, veg: true, shelf: "cakes",
      line: "Soft red velvet sponge layered with cream cheese frosting.",
      made: "Flour, cocoa, buttermilk, beetroot, cream cheese, butter, cane sugar (eggless)",
      rating: 4.7, count: 143,
      reviews: [["Soft crumb, and the frosting is tangy, as it should be.", "Aisha H."],
                ["Looks as good as it tastes.", "Kiran B."]] },
    "blueberry-cheesecake": { name: "Blueberry Cheesecake", price: 240, veg: true, shelf: "cheesecakes",
      line: "Baked cheesecake on a biscuit base, with blueberry compote poured over.",
      made: "Cream cheese, fresh cream, biscuit base, butter, blueberries, lemon",
      rating: 4.9, count: 187,
      reviews: [["Baked, not set. You can taste the difference.", "Lakshmi P."],
                ["The compote is made with real berries.", "Thomas G."]] }
  },
  shelves: {
    savouries:   { name: "Savouries",   order: ["paneer-sandwich", "chicken-wrap", "corn-sandwich", "chicken-burger"] },
    cakes:       { name: "Cakes",       order: ["chocolate-truffle", "red-velvet"] },
    cheesecakes: { name: "Cheesecakes", order: ["blueberry-cheesecake"] }
  },

  panels: {
    contact: {
      skin: "walnut", title: "Contact",
      rows: [
        ["Where", "Fort Kochi, Kerala"],
        ["Open", "Every day, 8 am to 11 pm"],
        ["Phone", "+91 484 000 0000"],
        ["Instagram", "@elaichi.kochi"]
      ],
      action: "Message us on WhatsApp",
      actionNote: "This is a demo site, so the button is not connected yet."
    },
    reviews: {
      skin: "walnut", title: "Reviews",
      summary: { rating: 4.8, count: 212 },
      quotes: [
        ["The filter kaapi tastes like the one my grandmother made.", "Suresh N."],
        ["Calm, green and never rushed. I work from here most mornings.", "Priya D."],
        ["Every drink lists what goes into it. I wish more cafés did that.", "Hannah J."],
        ["Come for the cardamom bun. Stay for a second one.", "Abdul R."]
      ],
      foot: "Sample reviews written for this demo."
    },
    about: {
      skin: "paper", title: "About us",
      body: [
        "Elaichi means cardamom. We named the café after the spice that grows in the hills above us and ends up in most of what we make.",
        "Our coffee comes from small estates in Wayanad and our tea from Munnar. Milk is delivered every morning. Nothing we serve comes out of a syrup bottle or a premix.",
        "We bake through the day in small batches, so the display changes by the hour."
      ]
    },
    merch: {
      skin: "paper", title: "Cups and bottles",
      lead: "Everything on this shelf is for sale.",
      list: [
        ["Stoneware mug", 450, "Hand-glazed, 300 ml"],
        ["Steel tumbler", 690, "Keeps coffee hot for six hours"],
        ["Glass cold cup", 390, "With a lid and a steel straw"],
        ["Brass-cap bottle", 590, "750 ml, for cold brew at home"]
      ]
    }
  },

  /* clickable areas on the scene. "at" says which surface of the 3D room the area sits on
     (wall = back wall, left = left wall, unit = fridge front, counter = front of the counter,
     case = behind the display glass, plaque). */
  spots: [
    { id: "b-new",     open: "board:new",      label: "New this week", box: [430, 139, 511, 265] },
    { id: "b-shakes",  open: "board:shakes",   label: "Milkshakes",    box: [539, 139, 621, 265] },
    { id: "b-ice",     open: "board:icecream", label: "Ice cream",     box: [645, 139, 728, 266] },
    { id: "b-tea",     open: "board:tea",      label: "Tea",           box: [755, 139, 837, 265] },
    { id: "b-coffee",  open: "board:coffee",   label: "Coffee",        box: [864, 139, 946, 266] },

    { id: "w-contact", at: "left", open: "panel:contact",  label: "Contact", box: [62, 195, 142, 391],
      poly: [[63, 195], [141, 215], [141, 385], [63, 390]] },
    { id: "w-reviews", at: "left", open: "panel:reviews",  label: "Reviews", box: [150, 219, 211, 386],
      poly: [[150, 219], [210, 233], [210, 382], [150, 385]] },
    { id: "p-about", at: "plaque",   open: "panel:about",    label: "About us", box: [648, 449, 750, 477] },

    { id: "m-coffee",  open: "board:coffee",   label: "Coffee",     box: [683, 340, 870, 447], dot: [800, 392] },
    { id: "m-fridge", at: "unit",  open: "board:shakes",   label: "Milkshakes", box: [905, 334, 1013, 466], dot: [959, 392] },
    { id: "m-tea",     open: "board:tea",      label: "Tea",        box: [1034, 350, 1102, 447], dot: [1068, 398] },
    { id: "m-merch", at: "counter",   open: "panel:merch",    label: "Cups and bottles", box: [1108, 455, 1336, 625], dot: [1222, 540] },

    { id: "d-paneer", at: "case",  open: "dish:paneer-sandwich",      box: [385, 503, 482, 546], oval: true },
    { id: "d-wrap", at: "case",    open: "dish:chicken-wrap",         box: [490, 496, 570, 546], oval: true },
    { id: "d-corn", at: "case",    open: "dish:corn-sandwich",        box: [390, 553, 474, 603], oval: true },
    { id: "d-burger", at: "case",  open: "dish:chicken-burger",       box: [478, 553, 566, 603], oval: true },
    { id: "d-choc", at: "case",    open: "dish:chocolate-truffle",    box: [610, 490, 703, 572], oval: true },
    { id: "d-velvet", at: "case",  open: "dish:red-velvet",           box: [710, 496, 802, 572], oval: true },
    { id: "d-cheese", at: "case",  open: "dish:blueberry-cheesecake", box: [833, 500, 927, 572], oval: true }
  ],

  hint: {
    mouse: "Click a menu board or anything on the counter.",
    touch: "Tap a menu board or anything on the counter. Drag to look around."
  }
};

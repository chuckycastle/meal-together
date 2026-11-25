"""
Family holiday recipes and the Thanksgiving day schedule.

Data only. Loaded by seed_family_recipes.py.

Each recipe: name, description, prep_time and cook_time in minutes, servings,
source_url, ingredients as (quantity, name), steps as (instruction, minutes),
timers as (name, minutes, step number starting at 1).
"""

RECIPES = [
    {
        'name': 'Cranberry sauce',
        'description': 'Three ingredients on the stove. Make it first so it has time to set.',
        'prep_time': 5,
        'cook_time': 15,
        'servings': 11,
        'source_url': 'https://www.allrecipes.com/recipe/9111/cranberry-sauce/',
        'ingredients': [
            ('12 ounces', 'Cranberries'),
            ('1 cup', 'White sugar'),
            ('1 cup', 'Orange juice'),
        ],
        'steps': [
            ('Dissolve the sugar in the orange juice in a medium saucepan over medium heat.', 3),
            ('Stir in the cranberries and cook until they start to pop, about 10 minutes.', 10),
            ('Take the pan off the heat and pour the sauce into a bowl. It thickens as it cools.', 2),
        ],
        'timers': [
            ('Cranberries', 10, 2),
        ],
    },
    {
        'name': 'Apple pie',
        'description': 'Butter crust made by hand or in a food processor, with a cooked apple filling.',
        'prep_time': 90,
        'cook_time': 120,
        'servings': 8,
        'source_url': 'https://www.foodnetwork.com/recipes/food-network-kitchen/apple-pie-recipe-2011423',
        'ingredients': [
            ('2 1/2 cups', 'All-purpose flour'),
            ('4 teaspoons, for the dough', 'White sugar'),
            ('1/4 teaspoon', 'Fine salt'),
            ('14 tablespoons, cold and diced', 'Butter'),
            ('1 large, beaten with 2 tablespoons cold water', 'Eggs'),
            ('2 tablespoons, fresh', 'Lemon juice'),
            ('3 pounds (Golden Delicious, Cortland, Mutsu)', 'Baking apples'),
            ('2/3 cup, plus more to sprinkle', 'White sugar'),
            ('1/4 cup', 'Unsalted butter'),
            ('1/4 teaspoon', 'Ground cinnamon'),
            ('1 generous pinch', 'Ground nutmeg'),
            ('1 large, lightly beaten', 'Eggs'),
        ],
        'steps': [
            ('Dough: whisk the flour, 4 teaspoons sugar, and salt. Work in the cold butter with your fingers, or '
             'pulse in a food processor, until it looks like coarse cornmeal with bean-size bits of butter.', 15),
            ('Stir in the egg and water until the dough comes together. Add up to 1 tablespoon cold water if it is '
             'dry. Shape into a disk, wrap, and chill for at least 1 hour.', 65),
            ('Filling: peel, halve, and core the apples. Cut each half into 4 wedges. Toss with the lemon juice, '
             'then with 2/3 cup sugar.', 15),
            ('Melt 1/4 cup butter in a large skillet over medium-high heat. Cook the apples, stirring, until the '
             'sugar dissolves and the pan simmers, about 2 minutes. Cover, turn down to medium-low, and cook until '
             'the apples soften and give up their juice, about 7 minutes.', 10),
            ('Strain the apples over a bowl. Return the juice to the skillet and simmer over medium heat until '
             'thick and lightly caramelized, about 10 minutes.', 10),
            ('Toss the apples with the reduced juice, cinnamon, and nutmeg. Cool completely.', 20),
            ('Cut the dough in half and roll each half into an 11 to 12 inch round. Layer between parchment on a '
             'baking sheet and chill 10 minutes. Set a rack in the lower third of the oven and heat to 375°F.', 15),
            ('Line a 9-inch pie pan with one round, leaving 1/2 inch of overhang. Mound in the filling. Brush the '
             'rim with beaten egg, lay on the second round, tuck the top edge under the bottom, and crimp. Brush '
             'the top with egg, sprinkle with sugar, and cut a few steam vents. Chill 15 minutes.', 25),
            ('Bake on a baking sheet until the crust is golden, about 50 minutes. Cool on a rack before serving.', 50),
        ],
        'timers': [
            ('Chill dough', 60, 2),
            ('Soften apples', 7, 4),
            ('Reduce juice', 10, 5),
            ('Chill pie', 15, 8),
            ('Bake apple pie', 50, 9),
        ],
    },
    {
        'name': 'Pumpkin pie',
        'description': "From the back of the Libby's can. Makes two 9-inch pies.",
        'prep_time': 15,
        'cook_time': 55,
        'servings': 16,
        'source_url': None,
        'ingredients': [
            ('1 can (29 ounces)', '100% pure pumpkin'),
            ('3 cups (24 fluid ounces)', 'Evaporated milk'),
            ('1 1/2 cups', 'White sugar'),
            ('2 teaspoons', 'Ground cinnamon'),
            ('1 teaspoon', 'Salt'),
            ('1 teaspoon', 'Ground ginger'),
            ('1/2 teaspoon', 'Ground cloves'),
            ('4 large', 'Eggs'),
            ('2 unbaked, 9-inch deep-dish', 'Pie shells'),
            ('optional, for serving', 'Whipped cream'),
        ],
        'steps': [
            ('Heat the oven to 425°F. Mix the sugar, cinnamon, salt, ginger, and cloves in a medium bowl.', 5),
            ('Beat the eggs in a large bowl. Stir in the pumpkin and the sugar and spice mix, then gradually stir '
             'in the evaporated milk.', 5),
            ('Pour the filling into the two pie shells.', 5),
            ('Bake at 425°F for 15 minutes.', 15),
            ('Turn the oven down to 350°F. Bake 30 to 40 minutes more, until the edges are firm and the center is '
             'set.', 40),
            ('Cool on a wire rack for 2 hours. Serve or refrigerate. Top with whipped cream before serving.', 120),
        ],
        'timers': [
            ('Pumpkin pies at 425°F', 15, 4),
            ('Pumpkin pies at 350°F', 30, 5),
            ('Cool pumpkin pies', 120, 6),
        ],
    },
    {
        'name': 'Honey-glazed ham',
        'description': 'Baked bone-in ham with a brown sugar, pineapple, and orange glaze brushed on at the end.',
        'prep_time': 5,
        'cook_time': 150,
        'servings': 20,
        'source_url': 'https://www.allrecipes.com/recipe/24501/tangy-honey-glazed-ham/',
        'ingredients': [
            ('1 (10 pound), fully cooked', 'Bone-in ham'),
            ('1 1/4 cups, packed', 'Dark brown sugar'),
            ('1/3 cup', 'Pineapple juice'),
            ('1/3 cup, or more to taste', 'Honey'),
            ('1/3 large', 'Orange'),
            ('2 tablespoons', 'Dijon mustard'),
            ('1/4 teaspoon', 'Ground cloves'),
            ('1 1/2 teaspoons, optional', 'Lemon juice'),
        ],
        'steps': [
            ('Heat the oven to 325°F. Set the ham on a rack in a roasting pan.', 5),
            ('Bake uncovered for 2 hours.', 120),
            ('While the ham bakes, make the glaze. Combine the brown sugar, pineapple juice, and honey in a '
             'saucepan. Zest in the orange, squeeze in its juice, and add the mustard and cloves. Whisk over '
             'medium-high heat until it boils, then simmer until slightly thick, 5 to 10 minutes.', 15),
            ('Taste the glaze. Lemon juice makes it tangier and honey makes it sweeter. Set aside.', 2),
            ('After 2 hours, brush the ham with glaze. Bake 30 to 45 minutes more, brushing again every '
             '10 minutes.', 45),
            ('Serve hot. Leftover glaze and the pan drippings make a sauce with a little flour or cornstarch.', 5),
        ],
        'timers': [
            ('Ham, first bake', 120, 2),
            ('Simmer glaze', 5, 3),
            ('Brush ham again', 10, 5),
            ('Ham, glazed bake', 30, 5),
        ],
    },
    {
        'name': 'Roast turkey',
        'description': 'Brined overnight, started at 500°F, then finished at 350°F under a foil shield. '
                       'The schedule covers roasting day; thaw and brine ahead.',
        'prep_time': 30,
        'cook_time': 165,
        'servings': 12,
        'source_url': 'https://altonbrown.com/wprm_print/good-eats-roast-turkey',
        'ingredients': [
            ('1 (14 to 16 pound), frozen, natural', 'Young turkey'),
            ('1 gallon, not low-sodium', 'Vegetable broth'),
            ('1 cup', 'Kosher salt'),
            ('1/2 cup', 'Light brown sugar'),
            ('1 tablespoon', 'Black peppercorns'),
            ('1 1/2 teaspoons', 'Allspice berries'),
            ('1 1/2 teaspoons, chopped', 'Candied ginger'),
            ('1 gallon', 'Heavily iced water'),
            ('1, quartered', 'Red apple'),
            ('1/2, quartered', 'Yellow onion'),
            ('1', 'Cinnamon stick'),
            ('4 sprigs', 'Fresh rosemary'),
            ('6 leaves', 'Fresh sage'),
            ('for the skin and foil', 'Canola oil'),
        ],
        'steps': [
            ('Two to three days ahead: thaw the turkey in the refrigerator or in a cooler kept at 38°F.', None),
            ('Make the brine. Bring the broth, salt, brown sugar, peppercorns, allspice, and ginger to a boil in '
             'a large stockpot, stirring to dissolve. Take it off the heat, cover, cool to room temperature, then '
             'refrigerate until cold.', None),
            ('The night before, or early that morning: combine the brine and iced water in a 5-gallon cooler. '
             'Submerge the turkey breast side down with the innards removed. Brine 8 to 16 hours in a cool spot, '
             'turning the bird once halfway.', None),
            ('Heat the oven to 500°F with a rack in the lowest position.', 5),
            ('Lift the turkey out, rinse it inside and out with cold water, and discard the brine. Set it on a '
             'rack in a roasting pan and pat it very dry.', 10),
            ('Fold heavy-duty foil into a triangle large enough to cover the breast. Oil it lightly, mold it over '
             'the breast, then lift it off and set it aside.', 5),
            ('Microwave the apple, onion, cinnamon stick, and 1 cup water on high for 5 minutes. Put the '
             'aromatics, without the water, in the cavity with the rosemary and sage. Tuck the wings under and '
             'coat the skin lightly with canola oil.', 10),
            ('Roast on the lowest rack at 500°F for 30 minutes.', 30),
            ('Insert a probe thermometer into the thickest part of the breast, cover the breast with the foil '
             'triangle, and turn the oven down to 350°F. Roast until the probe reads 155°F, about 90 minutes to '
             '2 hours more for a 14 to 16 pound bird.', 120),
            ('Rest the turkey, loosely covered with foil, for at least 15 minutes before carving.', 15),
        ],
        'timers': [
            ('Steep aromatics', 5, 7),
            ('Turkey at 500°F', 30, 8),
            ('Turkey at 350°F, first check', 90, 9),
            ('Rest turkey', 15, 10),
        ],
    },
    {
        'name': 'Green bean casserole',
        'description': 'Fresh beans in a mushroom cream sauce, topped with oven-crisped onions.',
        'prep_time': 25,
        'cook_time': 45,
        'servings': 6,
        'source_url': 'https://www.foodnetwork.com/recipes/alton-brown/best-ever-green-bean-casserole-recipe-1950575',
        'ingredients': [
            ('2 medium, thinly sliced', 'Onions'),
            ('1/4 cup plus 2 tablespoons', 'All-purpose flour'),
            ('2 tablespoons', 'Panko bread crumbs'),
            ('2 tablespoons plus 2 teaspoons, divided', 'Kosher salt'),
            ('for the sheet pan', 'Nonstick cooking spray'),
            ('1 pound, rinsed, trimmed, and halved', 'Fresh green beans'),
            ('2 tablespoons', 'Unsalted butter'),
            ('12 ounces, cut into 1/2-inch pieces', 'Mushrooms'),
            ('1/2 teaspoon, freshly ground', 'Black pepper'),
            ('2 cloves, minced', 'Garlic'),
            ('1/4 teaspoon, freshly ground', 'Ground nutmeg'),
            ('1 cup', 'Chicken broth'),
            ('1 cup', 'Half-and-half'),
        ],
        'steps': [
            ('Heat the oven to 475°F. Toss the onions with 1/4 cup flour, the panko, and 1 teaspoon salt. Spread '
             'them on a sprayed sheet pan and bake on the middle rack until golden, about 30 minutes, tossing 2 or '
             '3 times. Set aside and turn the oven down to 400°F.', 35),
            ('While the onions bake, bring a gallon of water and 2 tablespoons salt to a boil. Blanch the beans '
             'for 5 minutes, drain, and plunge them into ice water. Drain again.', 10),
            ('Melt the butter in a 12-inch cast iron skillet over medium-high heat. Cook the mushrooms with '
             '1 teaspoon salt and the pepper until they start to give up their liquid, 4 to 5 minutes.', 5),
            ('Add the garlic and nutmeg and cook 1 to 2 minutes. Sprinkle on 2 tablespoons flour, stir, and cook '
             '1 minute. Add the broth and simmer 1 minute.', 4),
            ('Turn the heat down to medium-low and add the half-and-half. Cook, stirring now and then, until the '
             'sauce thickens, 6 to 8 minutes.', 8),
            ('Off the heat, stir in a quarter of the onions and all of the beans. Top with the rest of the onions '
             'and bake until bubbly, about 15 minutes. Serve right away.', 15),
        ],
        'timers': [
            ('Crisp onions', 30, 1),
            ('Blanch beans', 5, 2),
            ('Thicken sauce', 6, 5),
            ('Bake casserole', 15, 6),
        ],
    },
    {
        'name': 'Mashed potatoes',
        'description': 'Yukon Gold and Russet potatoes with butter, warm milk, and cream cheese. '
                       'Halve it for a smaller table.',
        'prep_time': 20,
        'cook_time': 25,
        'servings': 12,
        'source_url': 'https://www.gimmesomeoven.com/best-mashed-potatoes-recipe/',
        'ingredients': [
            ('5 pounds (half Yukon Gold, half Russet)', 'Potatoes'),
            ('2 large cloves, minced', 'Garlic'),
            ('1 tablespoon plus 2 teaspoons, more to taste', 'Fine sea salt'),
            ('6 tablespoons', 'Butter'),
            ('1 cup', 'Whole milk'),
            ('4 ounces, room temperature', 'Cream cheese'),
            ('chopped, for topping', 'Fresh chives'),
            ('freshly cracked, for topping', 'Black pepper'),
        ],
        'steps': [
            ('Cut the potatoes, peeled or not, into even chunks about 1 inch thick. Put them in a large stockpot '
             'of cold water.', 15),
            ('Add cold water until it sits about 1 inch above the potatoes. Stir in the garlic and 1 tablespoon '
             'salt. Bring to a boil over high heat, then hold the boil at medium-high for 10 to 12 minutes, until '
             'a knife slides into a potato with almost no resistance. Drain well.', 20),
            ('While the potatoes boil, warm the butter, milk, and 2 teaspoons salt in a small saucepan or the '
             'microwave until the butter has just melted. Do not let the milk boil.', 5),
            ('Return the drained potatoes to the hot pot, set it over low heat, and shake gently for about '
             '1 minute to steam off moisture. Take the pot off the heat.', 2),
            ('Mash the potatoes to the texture you like.', 3),
            ('Fold in half of the butter mixture until absorbed, then the other half, then the cream cheese. Stop '
             'folding as soon as each addition is combined. Add more warm milk if needed.', 3),
            ('Taste, add salt if needed, and serve warm with chives and black pepper.', 2),
        ],
        'timers': [
            ('Boil potatoes', 10, 2),
            ('Dry potatoes', 1, 4),
        ],
    },
    {
        'name': "Mom's chorizo stuffing",
        'description': "Mom's stovetop version of the Mrs. Cubbison's box, with chorizo. "
                       'Her text does not give a chorizo amount.',
        'prep_time': 10,
        'cook_time': 15,
        'servings': 10,
        'source_url': None,
        'ingredients': [
            ('1 box (12 ounces)', 'Traditional stuffing mix'),
            ('1 cup, diced 1/4 inch', 'Onions'),
            ('1 cup, diced 1/4 inch', 'Celery'),
            (None, 'Chorizo'),
            ('1 1/2 cups', 'Chicken broth'),
            ('up to 1 cup (2 sticks), optional', 'Butter'),
        ],
        'steps': [
            ('Sauté the celery, onion, and chorizo in a large saucepan for 3 minutes, or until the vegetables '
             'are translucent. Add butter if you like.', 5),
            ('Add the chicken broth and bring it to a boil.', 3),
            ('Cover, turn the heat down, and simmer for 5 minutes.', 5),
            ('Take the pan off the heat and gently fold in the stuffing mix.', 2),
            ('Cover and let it stand for 5 minutes. Fluff with a fork and serve warm.', 5),
        ],
        'timers': [
            ('Sauté', 3, 1),
            ('Simmer broth', 5, 3),
            ('Stuffing stands', 5, 5),
        ],
    },
]

# The day as drawn on the family's schedule sheet: (local time, title, kind, color, recipe name)
THANKSGIVING = {
    'name': 'Thanksgiving 2026',
    'date': (2026, 11, 26),
    'serve_at': (18, 0),
    'items': [
        ((8, 30), 'Parade', 'event', 'ink', None),
        ((10, 0), 'Football', 'event', 'ink', None),
        ((11, 30), 'Cranberry sauce', 'dish', 'red', 'Cranberry sauce'),
        ((12, 0), 'Apple pie', 'dish', 'red', 'Apple pie'),
        ((12, 0), 'Pumpkin pie', 'dish', 'red', 'Pumpkin pie'),
        ((13, 45), 'Ham', 'dish', 'brown', 'Honey-glazed ham'),
        ((14, 45), 'Turkey', 'dish', 'brown', 'Roast turkey'),
        ((15, 30), 'Green bean casserole', 'dish', 'green', 'Green bean casserole'),
        ((15, 30), 'Mashed potatoes', 'dish', 'tan', 'Mashed potatoes'),
        ((16, 0), 'Stuffing', 'dish', 'orange', "Mom's chorizo stuffing"),
        ((16, 0), 'Brussels sprouts', 'dish', 'green', None),
        ((17, 30), 'Rolls', 'dish', 'tan', None),
    ],
}

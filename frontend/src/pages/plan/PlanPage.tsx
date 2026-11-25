/**
 * PlanPage
 * Home. Shows the next meal as a schedule sheet: when it goes on the table,
 * when each dish starts, who cooks it, and what is done.
 */

import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Pencil, ShoppingBasket } from 'lucide-react';
import { Layout } from '../../components/layout';
import { Avatar, BlankSlate, Clock, Notice, Spinner } from '../../components/kit';
import { MealSheet } from '../../components/plan/MealSheet';
import { MealDialog } from '../../components/plan/MealDialog';
import { ItemDialog } from '../../components/plan/ItemDialog';
import { AddDishesDialog } from '../../components/plan/AddDishesDialog';
import { Welcome } from '../../components/family/Welcome';
import { useFamily } from '../../contexts/FamilyContext';
import {
  useAddMealItem,
  useAddMealToShoppingList,
  useCreateMeal,
  useDeleteMeal,
  useDeleteMealItem,
  useMeals,
  useUpdateMeal,
  useUpdateMealItem,
} from '../../hooks/useMeals';
import { useMe } from '../../hooks/useMe';
import { useNow } from '../../hooks/useNow';
import { useRecipes } from '../../hooks/useRecipes';
import { useShoppingLists } from '../../hooks/useShoppingLists';
import { pickCurrentMeal } from '../../lib/meals';
import { dayDistanceLabel, longDateLabel } from '../../lib/time';
import type { Family, Meal, MealItem, MealItemKind } from '../../types';

type ItemEditor = { item?: MealItem; kind: MealItemKind } | null;

const MealView = ({ meal, meals, family }: { meal: Meal; meals: Meal[]; family: Family }) => {
  const now = useNow();
  const [, setSearchParams] = useSearchParams();
  const { data: recipes = [] } = useRecipes(family.id);
  const { data: shoppingLists = [] } = useShoppingLists(family.id);

  const createMeal = useCreateMeal(family.id);
  const updateMeal = useUpdateMeal(family.id, meal.id);
  const deleteMeal = useDeleteMeal(family.id);
  const addItem = useAddMealItem(family.id, meal.id);
  const updateItem = useUpdateMealItem(family.id, meal.id);
  const deleteItem = useDeleteMealItem(family.id, meal.id);
  const addToShopping = useAddMealToShoppingList(family.id, meal.id);

  const { userId } = useMe();
  const [mineOnly, setMineOnly] = useState(false);
  const [mealDialog, setMealDialog] = useState<'new' | 'edit' | null>(null);
  const [itemEditor, setItemEditor] = useState<ItemEditor>(null);
  const [addingDishes, setAddingDishes] = useState(false);

  const serveAt = new Date(meal.serve_at);
  const dishes = meal.items.filter((item) => item.kind === 'dish');
  const events = meal.items.filter((item) => item.kind === 'event');
  const doneCount = dishes.filter((item) => item.done).length;
  const members = family.members ?? [];

  const shoppingList = shoppingLists[0];
  const hasRecipes = dishes.some((item) => item.recipe);

  const byCook = new Map<number, { user: NonNullable<MealItem['cook']>; titles: string[] }>();
  for (const item of dishes) {
    if (!item.cook) continue;
    const entry = byCook.get(item.cook.id) ?? { user: item.cook, titles: [] };
    entry.titles.push(item.title);
    byCook.set(item.cook.id, entry);
  }
  // The signed-in person first
  const cooks = [...byCook.values()].sort((a, b) => Number(b.user.id === userId) - Number(a.user.id === userId));
  const unassigned = dishes.filter((item) => !item.cook && !item.done).length;
  const mine = dishes.filter((item) => item.cook?.id === userId);

  return (
    <>
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            {meals.length > 1 && (
              <label className="mb-2 block">
                <span className="sr-only">Meal</span>
                <select
                  className="field w-auto min-h-0 py-1 text-sm font-semibold"
                  value={meal.id}
                  onChange={(event) => setSearchParams({ meal: event.target.value })}
                >
                  {meals.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <h1 className="marker text-[clamp(2.4rem,7vw,4rem)] leading-[1.05]">{meal.name}</h1>
            <p className="mt-2 text-lg text-ink-2">
              {longDateLabel(serveAt)}, {dayDistanceLabel(serveAt, now)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setMealDialog('edit')}>
              <Pencil size={16} aria-hidden="true" />
              Edit meal
            </button>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setMealDialog('new')}>
              <Plus size={16} aria-hidden="true" />
              Plan another
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section aria-label="Cooking schedule">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <p className="flex items-baseline gap-2 text-lg">
              <span className="text-ink-2">On the table at</span>
              <Clock date={serveAt} className="text-3xl text-hot" />
            </p>
            {dishes.length > 0 && (
              <p className="text-sm font-semibold text-ink-2">
                {doneCount} of {dishes.length} done
              </p>
            )}
          </div>

          {dishes.length > 0 && (
            <div className="mb-3 inline-flex rounded-full border-[1.5px] border-line bg-paper p-0.5" role="group" aria-label="Whose dishes to show">
              {(
                [
                  [false, `Everyone's dishes`],
                  [true, `Yours (${mine.length})`],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={mineOnly === value}
                  onClick={() => setMineOnly(value)}
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    mineOnly === value ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {dishes.length === 0 ? (
            <BlankSlate
              title="Nothing on the menu yet"
              action={
                <button type="button" className="btn btn-primary" onClick={() => setAddingDishes(true)}>
                  <Plus size={18} aria-hidden="true" />
                  Add dishes
                </button>
              }
            >
              Add dishes and each one gets a start time counted back from {meal.name}.
            </BlankSlate>
          ) : (
            <>
              <MealSheet
                meal={meal}
                now={now}
                meId={userId}
                mineOnly={mineOnly}
                onToggle={(item, done) => updateItem.mutate({ itemId: item.id, data: { done } })}
                onEdit={(item) => setItemEditor({ item, kind: item.kind })}
              />
              <button type="button" className="btn btn-outline mt-4" onClick={() => setAddingDishes(true)}>
                <Plus size={18} aria-hidden="true" />
                Add dishes
              </button>
            </>
          )}
          {updateItem.isError && (
            <div className="mt-3">
              <Notice>The last change was not saved. Check your connection.</Notice>
            </div>
          )}
        </section>

        <aside className="space-y-8">
          <section aria-labelledby="events-heading">
            <h2 id="events-heading" className="marker text-xl">
              Also that day
            </h2>
            {events.length > 0 && (
              <ul className="mt-2 divide-y divide-line">
                {events.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="flex w-full items-baseline gap-3 py-2 text-left hover:bg-paper/60"
                      onClick={() => setItemEditor({ item, kind: 'event' })}
                      aria-label={`Edit ${item.title}`}
                    >
                      {item.start_at && <Clock date={new Date(item.start_at)} className="w-[4.5ch] text-xl text-hot" />}
                      <span className="marker text-xl">{item.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="btn btn-quiet btn-sm -ml-3 mt-1"
              onClick={() => setItemEditor({ kind: 'event' })}
            >
              <Plus size={16} aria-hidden="true" />
              Add the parade, a game, a guest arriving
            </button>
          </section>

          <section aria-labelledby="shopping-heading">
            <h2 id="shopping-heading" className="marker text-xl">
              Shopping
            </h2>
            {shoppingList && shoppingList.total_items > 0 ? (
              <p className="mt-2 text-ink-2">
                {shoppingList.checked_items} of {shoppingList.total_items} items picked up.{' '}
                <Link to="/shopping" className="font-semibold text-ink underline decoration-rule decoration-2 underline-offset-4">
                  Open the list
                </Link>
              </p>
            ) : (
              <p className="mt-2 text-ink-2">The shopping list is empty.</p>
            )}
            {addToShopping.data && (
              <p className="mt-2 text-sm text-ink-2" role="status">
                Added {addToShopping.data.added} {addToShopping.data.added === 1 ? 'ingredient' : 'ingredients'}.
                {addToShopping.data.skipped > 0 && ` ${addToShopping.data.skipped} were already on the list.`}
              </p>
            )}
            {addToShopping.isError && (
              <p className="mt-2 text-sm text-hot" role="alert">
                The ingredients were not added. Try again.
              </p>
            )}
            <button
              type="button"
              className="btn btn-outline btn-sm mt-3"
              disabled={!hasRecipes || addToShopping.isPending}
              onClick={() => addToShopping.mutate()}
            >
              <ShoppingBasket size={16} aria-hidden="true" />
              Add this menu's ingredients
            </button>
          </section>

          <section aria-labelledby="cooks-heading">
            <h2 id="cooks-heading" className="marker text-xl">
              Who is cooking
            </h2>
            {cooks.length === 0 ? (
              <p className="mt-2 text-ink-2">
                Nobody has a dish yet. Assign a recipe to someone, or tap "Needs a cook" on a dish.
              </p>
            ) : (
              <ul className="mt-2 space-y-3">
                {cooks.map(({ user, titles }) => (
                  <li key={user.id} className="flex items-start gap-3">
                    <Avatar user={user} size="sm" className="mt-0.5" filled={user.id === userId} />
                    <p className="leading-snug">
                      <span className="font-semibold">{user.id === userId ? 'You' : user.first_name}</span>
                      <span className="block text-sm text-ink-2">{titles.join(', ')}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {cooks.length > 0 && unassigned > 0 && (
              <p className="mt-3 text-sm text-ink-2">
                {unassigned} {unassigned === 1 ? 'dish has' : 'dishes have'} no cook yet.
              </p>
            )}
          </section>
        </aside>
      </div>

      {mealDialog === 'edit' && (
        <MealDialog
          meal={meal}
          onClose={() => setMealDialog(null)}
          onSave={(data) => updateMeal.mutateAsync(data)}
          onDelete={async () => {
            await deleteMeal.mutateAsync(meal.id);
            setSearchParams({});
          }}
        />
      )}
      {mealDialog === 'new' && (
        <MealDialog
          onClose={() => setMealDialog(null)}
          onSave={async (data) => {
            const created = await createMeal.mutateAsync(data);
            setSearchParams({ meal: String(created.id) });
          }}
        />
      )}
      {addingDishes && (
        <AddDishesDialog
          meal={meal}
          recipes={recipes}
          onClose={() => setAddingDishes(false)}
          onAdd={(data) => addItem.mutateAsync(data)}
        />
      )}
      {itemEditor && (
        <ItemDialog
          key={itemEditor.item?.id ?? `new-${itemEditor.kind}`}
          meal={meal}
          item={itemEditor.item}
          kind={itemEditor.kind}
          recipes={recipes}
          members={members}
          onClose={() => setItemEditor(null)}
          onSave={(data) =>
            itemEditor.item
              ? updateItem.mutateAsync({ itemId: itemEditor.item.id, data })
              : addItem.mutateAsync(data)
          }
          onDelete={itemEditor.item ? () => deleteItem.mutateAsync(itemEditor.item!.id) : undefined}
        />
      )}
    </>
  );
};

const FirstMeal = ({ family }: { family: Family }) => {
  const createMeal = useCreateMeal(family.id);
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto max-w-2xl pt-8">
      <h1 className="marker text-4xl">What are you cooking next?</h1>
      <p className="mt-2 max-w-prose text-ink-2">
        Name the meal and say when it goes on the table. Add dishes, and each one gets a start time counted back
        from that moment, so everything is ready together.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
          <Plus size={18} aria-hidden="true" />
          Plan a meal
        </button>
        <Link to="/recipes" className="btn btn-outline">
          Open recipes
        </Link>
      </div>
      {open && <MealDialog onClose={() => setOpen(false)} onSave={(data) => createMeal.mutateAsync(data)} />}
    </div>
  );
};

export const PlanPage = () => {
  const { activeFamily, families, isLoading: familiesLoading, error: familiesError } = useFamily();
  const { data: meals, isLoading: mealsLoading, isError } = useMeals(activeFamily?.id);
  const [searchParams] = useSearchParams();
  const [openedAt] = useState(() => new Date());

  const requestedId = Number(searchParams.get('meal'));
  const meal = useMemo(() => {
    if (!meals || meals.length === 0) return undefined;
    return meals.find((candidate) => candidate.id === requestedId) ?? pickCurrentMeal(meals, openedAt);
  }, [meals, requestedId, openedAt]);

  let content;
  if (familiesLoading) {
    content = <Spinner />;
  } else if (familiesError) {
    content = <Notice>Your family did not load. Check your connection and reload the page.</Notice>;
  } else if (families.length === 0) {
    content = <Welcome />;
  } else if (!activeFamily || mealsLoading) {
    content = <Spinner />;
  } else if (isError) {
    content = <Notice>The meal plan did not load. Check your connection and reload the page.</Notice>;
  } else if (!meal) {
    content = <FirstMeal family={activeFamily} />;
  } else {
    content = <MealView key={meal.id} meal={meal} meals={meals ?? []} family={activeFamily} />;
  }

  return <Layout wide>{content}</Layout>;
};

export default PlanPage;

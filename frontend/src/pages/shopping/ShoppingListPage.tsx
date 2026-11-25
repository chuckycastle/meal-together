/**
 * ShoppingListPage
 * One shared list, grouped by store section. Tap an item when it is in
 * the cart; it moves to the bottom.
 */

import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { Layout } from '../../components/layout';
import { BlankSlate, Notice, PageHeader, Spinner, Tick } from '../../components/kit';
import { useFamily } from '../../contexts/FamilyContext';
import {
  useAddItem,
  useCreateShoppingList,
  useDeleteItem,
  useShoppingList,
  useShoppingLists,
  useUpdateItem,
} from '../../hooks/useShoppingLists';
import { apiClient } from '../../services/api';
import type { ShoppingList, ShoppingListItem } from '../../types';

/** Store sections in the order most shops are walked */
const SECTIONS = ['Produce', 'Meat', 'Dairy & eggs', 'Bakery', 'Baking', 'Spices', 'Pantry', 'Frozen', 'Other'];

function sectionOf(item: ShoppingListItem): string {
  return item.category?.trim() || 'Other';
}

function groupBySection(items: ShoppingListItem[]): Array<[string, ShoppingListItem[]]> {
  const groups = new Map<string, ShoppingListItem[]>();
  for (const item of items) {
    const section = sectionOf(item);
    groups.set(section, [...(groups.get(section) ?? []), item]);
  }
  const rank = (section: string) => {
    const index = SECTIONS.indexOf(section);
    return index === -1 ? SECTIONS.length - 1.5 : index;
  };
  return [...groups.entries()].sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b));
}

interface ItemRowProps {
  item: ShoppingListItem;
  onToggle: (item: ShoppingListItem) => void;
  onDelete: (item: ShoppingListItem) => void;
}

const ItemRow = ({ item, onToggle, onDelete }: ItemRowProps) => (
  <li className="flex items-start gap-3 px-3 py-2.5 sm:px-4">
    <Tick checked={item.checked} onChange={() => onToggle(item)} label={`${item.name} in the cart`} className="mt-0.5" />
    <button type="button" className="min-w-0 flex-1 text-left leading-snug" onClick={() => onToggle(item)} tabIndex={-1}>
      <span className={`text-lg font-semibold ${item.checked ? 'struck' : ''}`}>{item.name}</span>
      {(item.quantity || item.notes) && (
        <span className={`block text-[0.95rem] text-ink-2 ${item.checked ? 'opacity-60' : ''}`}>
          {[item.quantity, item.notes].filter(Boolean).join(' / ')}
        </span>
      )}
    </button>
    <button
      type="button"
      className="btn btn-quiet btn-icon btn-sm"
      onClick={() => onDelete(item)}
      aria-label={`Remove ${item.name}`}
    >
      <X size={16} aria-hidden="true" />
    </button>
  </li>
);

export const ShoppingListPage = () => {
  const { activeFamily, isLoading: familyLoading } = useFamily();
  const familyId = activeFamily?.id;
  const queryClient = useQueryClient();

  const { data: lists = [], isLoading: listsLoading, isError: listsError } = useShoppingLists(familyId, true);
  const activeList = lists[0];
  const { data: detail, isLoading: detailLoading } = useShoppingList(familyId, activeList?.id);
  const list = detail ?? activeList;

  const createList = useCreateShoppingList(familyId ?? 0);
  const addItem = useAddItem(familyId ?? 0, activeList?.id ?? 0);
  const updateItem = useUpdateItem(familyId ?? 0, activeList?.id ?? 0);
  const deleteItem = useDeleteItem(familyId ?? 0, activeList?.id ?? 0);

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [section, setSection] = useState('Other');
  const [problem, setProblem] = useState('');
  const [adding, setAdding] = useState(false);

  const items = useMemo(() => list?.items ?? [], [list]);
  const toBuy = useMemo(() => groupBySection(items.filter((item) => !item.checked)), [items]);
  const inCart = useMemo(() => items.filter((item) => item.checked), [items]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['shoppingLists', familyId] });

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !familyId || !activeFamily) return;

    setAdding(true);
    setProblem('');
    try {
      const data = { name: trimmed, quantity: quantity.trim() || undefined, category: section };
      if (activeList) {
        await addItem.mutateAsync(data);
      } else {
        // The first item creates the list
        const created = await createList.mutateAsync({ name: `${activeFamily.name} shopping` });
        await apiClient.addShoppingItem(familyId, created.id, data);
      }
      await refresh();
      setName('');
      setQuantity('');
    } catch {
      setProblem('The item was not added. Check your connection and try again.');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (item: ShoppingListItem) => {
    if (!activeList) return;
    const key = ['shoppingLists', familyId, activeList.id];
    const previous = queryClient.getQueryData<ShoppingList>(key);
    // Move the item at once; the server copy follows
    queryClient.setQueryData<ShoppingList>(key, (current) =>
      current
        ? {
            ...current,
            items: current.items?.map((candidate) =>
              candidate.id === item.id ? { ...candidate, checked: !item.checked } : candidate
            ),
          }
        : current
    );
    setProblem('');
    try {
      await updateItem.mutateAsync({ itemId: item.id, data: { checked: !item.checked, version: item.version } });
    } catch (error) {
      queryClient.setQueryData(key, previous);
      const status = (error as { status?: number })?.status;
      setProblem(
        status === 409
          ? `Someone else just changed ${item.name}. The list is now up to date.`
          : 'The change was not saved. Check your connection.'
      );
      await refresh();
    }
  };

  const handleDelete = async (item: ShoppingListItem) => {
    setProblem('');
    try {
      await deleteItem.mutateAsync(item.id);
    } catch {
      setProblem(`${item.name} was not removed. Try again.`);
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm(`Remove ${inCart.length} picked-up ${inCart.length === 1 ? 'item' : 'items'} from the list?`)) {
      return;
    }
    setProblem('');
    try {
      for (const item of inCart) {
        await deleteItem.mutateAsync(item.id);
      }
    } catch {
      setProblem('Some items were not removed. Try again.');
    }
  };

  let content;
  if (familyLoading || listsLoading || (activeList && detailLoading && !list)) {
    content = <Spinner />;
  } else if (!activeFamily) {
    content = (
      <BlankSlate
        title="The shopping list belongs to a family"
        action={
          <Link to="/" className="btn btn-primary">
            Set up your family
          </Link>
        }
      />
    );
  } else if (listsError) {
    content = <Notice>The shopping list did not load. Check your connection and reload the page.</Notice>;
  } else {
    content = (
      <>
        <form onSubmit={handleAdd} className="surface mb-6 grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_9rem_10rem_auto]">
          <input
            className="field"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Add an item"
            aria-label="Item"
            maxLength={255}
          />
          <input
            className="field"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder="How much"
            aria-label="How much"
            maxLength={50}
          />
          <select className="field" value={section} onChange={(event) => setSection(event.target.value)} aria-label="Store section">
            {SECTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary" disabled={adding || !name.trim()}>
            <Plus size={18} aria-hidden="true" />
            Add
          </button>
        </form>

        {problem && (
          <div className="mb-4">
            <Notice>{problem}</Notice>
          </div>
        )}

        {items.length === 0 ? (
          <BlankSlate
            title="Nothing to buy"
            action={
              <Link to="/plan" className="btn btn-outline">
                Open the plan
              </Link>
            }
          >
            Add items above, or open a meal and add its ingredients in one step.
          </BlankSlate>
        ) : (
          <div className="space-y-6">
            {toBuy.map(([sectionName, sectionItems]) => (
              <section key={sectionName} aria-label={sectionName}>
                <h2 className="marker mb-2 flex items-baseline gap-2 text-xl">
                  {sectionName}
                  <span className="font-sans text-sm font-semibold text-ink-3">{sectionItems.length}</span>
                </h2>
                <ul className="surface divide-y divide-line">
                  {sectionItems.map((item) => (
                    <ItemRow key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} />
                  ))}
                </ul>
              </section>
            ))}

            {toBuy.length === 0 && (
              <p className="marker py-4 text-center text-2xl">Everything is in the cart.</p>
            )}

            {inCart.length > 0 && (
              <section aria-label="In the cart">
                <div className="mb-2 flex items-baseline justify-between gap-4">
                  <h2 className="marker flex items-baseline gap-2 text-xl text-ink-2">
                    In the cart
                    <span className="font-sans text-sm font-semibold text-ink-3">{inCart.length}</span>
                  </h2>
                  <button type="button" className="btn btn-quiet btn-sm" onClick={handleClearCart}>
                    Remove picked-up items
                  </button>
                </div>
                <ul className="divide-y divide-line rounded-surface border border-line">
                  {inCart.map((item) => (
                    <ItemRow key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Shopping"
        description={items.length > 0 ? `${inCart.length} of ${items.length} picked up` : undefined}
      />
      {content}
    </Layout>
  );
};

export default ShoppingListPage;

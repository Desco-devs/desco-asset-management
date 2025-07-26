# 🚀 Desco Realtime Pattern - SIMPLE & EFFECTIVE

> **GOLDEN RULE**: Keep it simple, stupid! No overengineering. Make it work, keep it clean.

## 📋 Table of Contents

- [Pattern Overview](#pattern-overview)
- [File Organization](#file-organization)
- [Step-by-Step Implementation](#step-by-step-implementation)
- [Code Examples](#code-examples)
- [DO's and DON'Ts](#dos-and-donts)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Pattern Overview

Our realtime pattern follows **3 simple layers**:

```
┌─────────────────────────────────────────────────┐
│                   UI LAYER                      │
│  Components + Simple Zustand Store (UI only)   │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│                DATA LAYER                       │
│     TanStack Query + Optimistic Updates        │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│              REALTIME LAYER                     │
│   Supabase Realtime → Cache Invalidation       │
└─────────────────────────────────────────────────┘
```

### **Key Principles:**

1. **Separation of Concerns**: UI state ≠ Data state
2. **Single Source of Truth**: TanStack Query manages all data
3. **Optimistic Updates**: Instant UI feedback
4. **Simple Realtime**: Just invalidate cache, let TanStack Query refetch
5. **No Magic**: Standard patterns everyone understands

---

## 📁 File Organization

### **Required Files for Any Entity:**

```
src/
├── types/
│   └── [entity].ts                 # Clean TypeScript interfaces
├── hooks/
│   ├── use[Entity]Query.ts         # TanStack Query CRUD operations
│   └── use[Entity]Realtime.ts      # Simple Supabase realtime hook
├── stores/
│   └── [entity]Store.ts            # UI state only (modals, filters, pagination)
└── app/
    └── [entity]/
        └── components/
            ├── [Entity]List.tsx    # Main list component
            └── [Entity]Page.tsx    # Page wrapper with modals
```

### **Example Structure (Equipment):**

```
src/
├── types/equipment.ts              ✅ Matches Prisma schema exactly
├── hooks/
│   ├── useEquipmentQuery.ts        ✅ CRUD + optimistic updates
│   └── useEquipmentRealtime.ts     ✅ 30 lines, just invalidates cache
├── stores/equipmentStore.ts        ✅ UI state: modals, filters, pagination
└── app/(admin-dashboard)/equipments/
    └── components/
        ├── EquipmentsListModern.tsx    ✅ Data display + interactions
        └── EquipmentsPageModern.tsx    ✅ Modal management
```

---

## 🔧 Step-by-Step Implementation

### **1. Create Types (`types/[entity].ts`)**

```typescript
// ✅ GOOD: Match Prisma schema exactly
export interface Equipment {
  id: string; // Prisma field names
  brand: string;
  insurance_expiration_date: string | null; // Exact field names
  // ... rest of fields from Prisma
  project: Project; // Relations
}

// ❌ BAD: Custom field names that don't match database
export interface Equipment {
  uid: string; // Different from database
  insuranceDate: string; // Camel case when DB uses snake_case
}
```

### **2. Create Realtime Hook (`hooks/use[Entity]Realtime.ts`)**

```typescript
// ✅ SIMPLE: Just invalidate cache
export function useEquipmentRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("equipment-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "equipment",
        },
        () => {
          // Just invalidate - let TanStack Query handle the rest
          queryClient.invalidateQueries({ queryKey: ["equipments"] });
        }
      )
      .subscribe();

    return () => channel.unsubscribe();
  }, [queryClient]);
}

// ❌ BAD: Complex error handling, manual data transformation
// Don't do 500-line hooks with error suppression!
```

### **3. Create Query Hook (`hooks/use[Entity]Query.ts`)**

```typescript
// ✅ SIMPLE: Standard TanStack Query patterns
export function useEquipments() {
  return useQuery({
    queryKey: ["equipments"],
    queryFn: fetchEquipments,
    staleTime: 0, // Always fresh for realtime
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEquipment,
    onMutate: async (formData) => {
      // Optimistic update for instant feedback
      // ... simple optimistic logic
    },
    onError: (error, formData, context) => {
      // Rollback on error
    },
    onSuccess: () => {
      // Realtime will handle cache update
    },
  });
}
```

### **4. Create UI Store (`stores/[entity]Store.ts`)**

```typescript
// ✅ SIMPLE: UI state only, no data management
interface EquipmentUIState {
  // Modals
  isModalOpen: boolean;
  selectedEquipment: Equipment | null;

  // Filters (not persisted - start fresh)
  searchQuery: string;
  filterStatus: string;

  // Actions
  setIsModalOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;

  // Simple filtering function
  getFilteredEquipments: (equipments: Equipment[]) => Equipment[];
}

// ❌ BAD: Don't put data fetching or complex computed state in store
```

### **5. Use in Components**

```typescript
// ✅ SIMPLE: Clean component with clear data flow
export function EquipmentsList() {
  // Data layer
  const { data: equipments = [], isLoading } = useEquipments();
  useEquipmentRealtime(); // Activate realtime

  // UI layer
  const searchQuery = useEquipmentStore(selectSearchQuery);
  const getFilteredEquipments = useEquipmentStore(
    (state) => state.getFilteredEquipments
  );

  // Compute display data
  const filteredEquipments = getFilteredEquipments(equipments);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div>
      {filteredEquipments.map((equipment) => (
        <EquipmentCard key={equipment.id} equipment={equipment} />
      ))}
    </div>
  );
}
```

---

## ✅ DO's and ❌ DON'Ts

### **✅ DO's:**

1. **Keep it simple** - If it's complex, you're doing it wrong
2. **Match Prisma schema** - Use exact field names from database
3. **Separate concerns** - UI state ≠ Data state
4. **Use standard patterns** - TanStack Query + Zustand + Supabase
5. **Optimistic updates** - For instant user feedback
6. **Single responsibility** - Each hook/store does one thing well
7. **Type everything** - TypeScript prevents bugs
8. **Test realtime** - Open multiple tabs to verify sync

### **❌ DON'Ts:**

1. **Don't overengineer** - No 500-line hooks with error suppression
2. **Don't mix concerns** - Don't put data fetching in UI store
3. **Don't transform data unnecessarily** - Use database field names
4. **Don't handle every edge case** - Handle common cases well
5. **Don't write custom cache logic** - Let TanStack Query handle it
6. **Don't suppress errors globally** - Fix the root cause
7. **Don't create custom abstractions** - Use proven patterns
8. **Don't batch everything** - Simple invalidation works fine

---

## 📚 Code Examples

### **Complete CRUD Hook Template:**

```typescript
// hooks/use[Entity]Query.ts
export function use[Entity]s() {
  return useQuery({
    queryKey: ['[entities]'],
    queryFn: fetch[Entity]s,
    staleTime: 0, // Always fresh for realtime
  });
}

export function useCreate[Entity]() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: create[Entity],
    onMutate: async (formData) => {
      await queryClient.cancelQueries({ queryKey: ['[entities]'] });
      const previous = queryClient.getQueryData(['[entities]']);

      // Simple optimistic update
      queryClient.setQueryData(['[entities]'], (old) =>
        old ? [optimistic[Entity], ...old] : [optimistic[Entity]]
      );

      return { previous };
    },
    onError: (error, formData, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['[entities]'], context.previous);
      }
      toast.error(`Failed to create [entity]: ${error.message}`);
    },
    onSuccess: (new[Entity]) => {
      toast.success(`[Entity] created successfully!`);
    },
  });
}

export function useUpdate[Entity]() {
  // Similar pattern...
}

export function useDelete[Entity]() {
  // Similar pattern...
}
```

### **Complete Realtime Hook Template:**

```typescript
// hooks/use[Entity]Realtime.ts
export function use[Entity]Realtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('[entity]-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: '[table_name]'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['[entities]'] });
      })
      .subscribe();

    return () => channel.unsubscribe();
  }, [queryClient]);
}
```

### **Complete UI Store Template:**

```typescript
// stores/[entity]Store.ts
interface [Entity]UIState {
  // Modal state
  isModalOpen: boolean;
  isCreateModalOpen: boolean;
  selected[Entity]: [Entity] | null;

  // Filters (not persisted)
  searchQuery: string;
  filterStatus: string;
  currentPage: number;

  // Actions
  setIsModalOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;

  // Utility
  getFiltered[Entity]s: ([entities]: [Entity][]) => [Entity][];
  resetFilters: () => void;
}

export const use[Entity]Store = create<[Entity]UIState>()(
  persist((set, get) => ({
    // State
    isModalOpen: false,
    searchQuery: '',

    // Actions
    setIsModalOpen: (open) => set({ isModalOpen: open }),
    setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }),

    // Utility
    getFiltered[Entity]s: ([entities]) => {
      const { searchQuery, filterStatus } = get();
      return [entities].filter([entity] =>
        // Simple filtering logic
        [entity].name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    },
  }), {
    name: '[entity]-ui-settings',
    partialize: (state) => ({
      // Only persist UI preferences
      currentPage: state.currentPage,
    }),
  })
);
```

---

## 🐛 Troubleshooting

### **Common Issues:**

1. **Realtime not working?**

   - Check Supabase connection
   - Verify table name matches exactly
   - Ensure TanStack Query is running

2. **Optimistic updates not rolling back?**

   - Check error handling in mutations
   - Verify context is passed correctly

3. **TypeScript errors?**

   - Ensure types match Prisma schema exactly
   - Check field name mapping (snake_case vs camelCase)

4. **Performance issues?**
   - Don't over-invalidate cache
   - Use proper selectors to prevent re-renders

### **Debug Checklist:**

- [ ] Types match Prisma schema exactly
- [ ] Realtime hook is called in component
- [ ] TanStack Query keys are consistent
- [ ] Error boundaries catch mistakes
- [ ] Multiple tabs sync properly

---

## 🎯 Success Metrics

You know the pattern is working when:

1. **Instant UI Updates** - Changes appear immediately
2. **Real-time Sync** - Multiple tabs stay in sync
3. **Simple Code** - New developers understand it quickly
4. **No Bugs** - Standard patterns prevent edge cases
5. **Easy to Extend** - Adding new entities is straightforward

---

## 🚀 Quick Start Checklist

When adding a new entity:

1. [ ] Create types matching Prisma schema
2. [ ] Add realtime hook (copy template)
3. [ ] Add query hook with CRUD operations
4. [ ] Add UI store for modal/filter state
5. [ ] Use hooks in components
6. [ ] Test with multiple browser tabs
7. [ ] Verify optimistic updates work
8. [ ] Check error handling

---

**Remember: SIMPLE CODE IS GOOD CODE. If it's getting complex, step back and simplify!** 🎯

---

_Created for Desco project - Keep it simple, keep it working!_ 🚀

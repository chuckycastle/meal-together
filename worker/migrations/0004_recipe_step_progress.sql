-- Which steps of a recipe are done, shared by the whole family.
-- A step is named by its place in the recipe's ordered steps, not by its
-- row id: saving a recipe replaces its step rows, and the place survives that.

CREATE TABLE recipe_step_progress (
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  done_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  done_at TEXT NOT NULL,
  PRIMARY KEY (recipe_id, position)
);

CREATE TABLE IF NOT EXISTS food_inventory (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, item_id)
);

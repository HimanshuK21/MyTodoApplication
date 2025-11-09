import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

it("can add a todo and mark complete", async () => {
  render(<App />);
  const user = userEvent.setup();
  const input = screen.getByPlaceholderText(/todo text/i);
  const addBtn = screen.getByRole("button", { name: /add/i });

  await user.type(input, "Test todo");
  await user.click(addBtn);

  const todo = await screen.findByText(/Test todo/i);
  expect(todo).toBeInTheDocument();

  const checkbox = screen.getByRole("checkbox");
  await user.click(checkbox);
  expect(todo).toHaveStyle("text-decoration: line-through");
});
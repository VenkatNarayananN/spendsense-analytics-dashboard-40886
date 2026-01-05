import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders SpendSense brand on landing", () => {
  render(<App />);
  const brand = screen.getByText(/spendsense/i);
  expect(brand).toBeInTheDocument();
});

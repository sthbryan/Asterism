import { Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { Shell } from "./app/Shell";

export default function App() {
  return (
    <Router hook={useHashLocation}>
      <Shell />
    </Router>
  );
}

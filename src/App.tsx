import { Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { StoreProvider } from "./app/store";
import { Shell } from "./app/routes";

export default function App() {
  return (
    <Router hook={useHashLocation}>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </Router>
  );
}

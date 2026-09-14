import { Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { Shell } from "./app/routes";
import { StoreProvider } from "./app/store";

export default function App() {
  return (
    <Router hook={useHashLocation}>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </Router>
  );
}

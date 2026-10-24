import { invoke } from "@tauri-apps/api/core";
import { useLayoutEffect } from "react";
import { Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { Shell } from "./app/Shell";

export default function App() {
  // The window is created hidden (see tauri.conf.json); reveal it as soon as
  // the first view is committed. The Rust side reveals it after a timeout if
  // this never runs.
  useLayoutEffect(() => {
    void invoke("show_main_window").catch(() => {});
  }, []);

  return (
    // wouter's Router receives the location hook as a prop and calls it itself.
    // oxlint-disable-next-line react/hooks
    <Router hook={useHashLocation}>
      <Shell />
    </Router>
  );
}

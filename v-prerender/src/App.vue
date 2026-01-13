<template>
  <div id="app">
    <AppNavbar />
    <router-view />
    <AppDock />
  </div>
</template>

<script setup>
import AppNavbar from './components/AppNavbar.vue'
import AppDock from './components/AppDock.vue'
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Orbitron:wght@600&display=swap');

body {
  font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  margin: 0;
  background-color: #f8fafc;
  color: #0f172a;
}

html, body, #app {
  background-color: #f8fafc;
}

main {
  padding: 2rem;
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 12px;
  background-color: transparent;
}

th, td {
  text-align: left;
  padding: 16px;
  background-color: #1e1e1e;
  color: #e0e0e0;
  border: 1px solid #444;
  border-radius: 8px;
}

th {
  background: linear-gradient(180deg, #3a3a3a, #1e1e1e);
  font-size: 1.1rem;
  letter-spacing: 0.05rem;
  text-transform: uppercase;
}

tr:hover td {
  background-color: #2a2a2a;
}

button:not(.btn-add):not(.action-btn):not(.delete-btn):not(.menu-btn) {
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  background-color: #32cd32;
  color: #0e0e0e;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

button:not(.btn-add):not(.action-btn):not(.delete-btn):not(.menu-btn):hover {
  background-color: #9fff9f;
  color: #000;
}
</style>

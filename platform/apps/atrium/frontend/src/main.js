import { createApp } from "vue";
import { createPinia } from "pinia";
import "./app.css";
import "./styles/layout-system.css";
import "./styles/surfaces/dashboard.css";
import "./styles/surfaces/palette.css";
import "./styles/entry-surfaces.css";
import "./styles/shell-surfaces.css";
import App from "./App.vue";
import { createAtriumRouter } from "./router/index.js";

const app = createApp(App);
const pinia = createPinia();
const router = createAtriumRouter(pinia);

app.use(pinia);
app.use(router);
app.mount("#app");

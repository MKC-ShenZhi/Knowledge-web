import { createApp } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import App from "./App.vue";
import router from "./router";
import { pinia } from "./store";
import "./style.css";
import "./styles/tokens.css";

const app = createApp(App);

// 全局错误处理：捕获未处理的异常，避免白屏
app.config.errorHandler = (err, _instance, info) => {
  console.error("[Global]", info, err);
};

// 捕获未处理的 Promise rejection
window.addEventListener("unhandledrejection", (event) => {
  console.error("[UnhandledRejection]", event.reason);
});

app.use(router).use(pinia).use(ElementPlus).mount("#app");

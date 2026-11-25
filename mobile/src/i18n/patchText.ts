import { Text, TextInput } from "react-native";
import { tr } from "./autoTranslate";

function mapChildren(ch: any): any {
  if (typeof ch === "string") return tr(ch);
  if (Array.isArray(ch)) return ch.map(mapChildren);
  return ch;
}

function fixProps(type: any, props: any) {
  if (!props) return props;
  try {
    if (type === Text && props.children !== undefined) {
      return { ...props, children: mapChildren(props.children) };
    }
    if (type === TextInput && typeof props.placeholder === "string") {
      return { ...props, placeholder: tr(props.placeholder) };
    }
  } catch (e) {
    return props;
  }
  return props;
}

function patch(rt: any, key: string) {
  try {
    const orig = rt && rt[key];
    if (typeof orig !== "function" || orig.__nodjuntaPatched) return;
    const novo: any = function (this: any, type: any, props: any, ...rest: any[]) {
      return orig.call(this, type, fixProps(type, props), ...rest);
    };
    novo.__nodjuntaPatched = true;
    rt[key] = novo;
  } catch (e) {
    // se não for possível alterar, o app continua em português
  }
}

let done = false;

export function installTextPatch() {
  if (done) return;
  done = true;
  try {
    const rt = require("react/jsx-runtime");
    patch(rt, "jsx");
    patch(rt, "jsxs");
  } catch (e) {}
  try {
    const dev = require("react/jsx-dev-runtime");
    patch(dev, "jsxDEV");
    patch(dev, "jsx");
    patch(dev, "jsxs");
  } catch (e) {}
}

installTextPatch();

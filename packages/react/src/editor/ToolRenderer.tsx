import { Accordion } from "../components/Accordion";
import { Button as ToolButton } from "../components/Button";
import { Card } from "../components/Card";
import { Carousel } from "../components/Carousel";
import { Contact } from "../components/Contact";
import { Divider } from "../components/Divider";
import { Image } from "../components/Image";
import { Navbar } from "../components/Navbar";
import { Social } from "../components/Social";
import { Tabs } from "../components/Tabs";
import { Text } from "../components/Text";
import type { ToolNode } from "./types";

export function ToolRenderer({ tool }: { tool: ToolNode }) {
  switch (tool.type) {
    case "accordion":
      return <Accordion {...tool.props} />;
    case "text":
      return <Text {...tool.props} />;
    case "image":
      return <Image {...tool.props} />;
    case "button":
      return <ToolButton {...tool.props} />;
    case "carousel":
      return <Carousel {...tool.props} />;
    case "card":
      return <Card {...tool.props} />;
    case "contact":
      return <Contact {...tool.props} />;
    case "navbar":
      return <Navbar {...tool.props} />;
    case "divider":
      return <Divider {...tool.props} />;
    case "social":
      return <Social {...tool.props} />;
    case "tabs":
      return <Tabs {...tool.props} />;
    case "custom":
      return (
        <div>
          {tool.props.componentName}
        </div>
      );
    default:
      return null;
  }
}

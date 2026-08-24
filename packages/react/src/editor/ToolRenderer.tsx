import { Accordion } from "../components/Accordion";
import { Avatar } from "../components/Avatar";
import { Badge } from "../components/Badge";
import { Button as ToolButton } from "../components/Button";
import { Card } from "../components/Card";
import { Carousel } from "../components/Carousel";
import { Contact } from "../components/Contact";
import { Divider } from "../components/Divider";
import { Image } from "../components/Image";
import { Icon } from "../components/Icon";
import { Input } from "../components/Input";
import { List } from "../components/List";
import { Navbar } from "../components/Navbar";
import { Newsletter } from "../components/Newsletter";
import { Social } from "../components/Social";
import { Tabs } from "../components/Tabs";
import { Text } from "../components/Text";
import type { ToolNode } from "./types";

export function ToolRenderer({ tool }: { tool: ToolNode }) {
  switch (tool.type) {
    case "accordion":
      return <Accordion {...tool.props} />;
    case "avatar":
      return <Avatar {...tool.props} />;
    case "badge":
      return <Badge {...tool.props} />;
    case "input":
      return <Input {...tool.props} />;
    case "list":
      return <List {...tool.props} />;
    case "newsletter":
      return <Newsletter {...tool.props} />;
    case "text":
      return <Text {...tool.props} />;
    case "image":
      return <Image {...tool.props} />;
    case "icon":
      return <Icon {...tool.props} />;
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
      return <Text {...tool.props.data} />;
    default:
      return null;
  }
}

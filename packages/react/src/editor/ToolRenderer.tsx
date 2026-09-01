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
import { asEditorTool, type ToolNode } from "./types";

export function ToolRenderer({ tool }: { tool: ToolNode }) {
  const editorTool = asEditorTool(tool);

  switch (editorTool.type) {
    case "accordion":
      return <Accordion {...editorTool.props} />;
    case "avatar":
      return <Avatar {...editorTool.props} />;
    case "badge":
      return <Badge {...editorTool.props} />;
    case "input":
      return <Input {...editorTool.props} />;
    case "list":
      return <List {...editorTool.props} />;
    case "newsletter":
      return <Newsletter {...editorTool.props} />;
    case "text":
      return <Text {...editorTool.props} />;
    case "image":
      return <Image {...editorTool.props} />;
    case "icon":
      return <Icon {...editorTool.props} />;
    case "button":
      return <ToolButton {...editorTool.props} />;
    case "carousel":
      return <Carousel {...editorTool.props} />;
    case "card":
      return <Card {...editorTool.props} />;
    case "contact":
      return <Contact {...editorTool.props} />;
    case "navbar":
      return <Navbar {...editorTool.props} />;
    case "divider":
      return <Divider {...editorTool.props} />;
    case "social":
      return <Social {...editorTool.props} />;
    case "tabs":
      return <Tabs {...editorTool.props} />;
    case "custom":
      return <Text {...editorTool.props.data} />;
    default:
      return null;
  }
}

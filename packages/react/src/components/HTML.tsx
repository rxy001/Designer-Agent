export type HTMLProps = {
  html: string;
};

export function HTML({ html }: HTMLProps) {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: html,
      }}
    />
  );
}

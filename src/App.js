import React from "react";
import { content } from "../content";
import ContentCard from "./ContentCard";

export default () => {
  return (
    <div class="code lh-copy">
      <article>
        <div class="cf pa2 self-center">
          {content.map(({ name, desc }) => (
            <ContentCard name={name} desc={desc} />
          ))}
        </div>
      </article>
    </div>
  );
};

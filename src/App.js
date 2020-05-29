import React from "react";
import { content } from "../content";
import ContentCard from "./ContentCard";

export default () => {
  return (
    <div className="code lh-copy">
      <article>
        <div className="cf pa2 self-center">
          {content.map(({ name, desc, url }) => (
            <ContentCard name={name} desc={desc} url={url} />
          ))}
        </div>
      </article>
    </div>
  );
};

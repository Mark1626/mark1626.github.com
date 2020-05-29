import React from "react";

export default ({ title, desc, url }) => {
  return (
    <div className="fl w-50 w-third-m w-third-l pa3">
      <a href={url} className="db link dim tc ba bw2">
        <h2>{title}</h2>
        <p>{desc}</p>
      </a>
    </div>
  );
};

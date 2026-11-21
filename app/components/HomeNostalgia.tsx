import ScrollRow from "./ScrollRow";
import SectionHead from "./SectionHead";
import { getHomeNostalgia } from "@/lib/nostalgia-data";

export default async function HomeNostalgia() {
  const items = await getHomeNostalgia();
  if (items.length === 0) return null;

  return (
    <section className="band">
      <div className="max-w-6xl mx-auto">
        <SectionHead
          title="Nostalgia"
          sub={"Specjale starsze ni\u017c 5 lat"}
          linkHref="/nostalgia"
          linkText={"Zobacz wszystkie \u2192"}
        />
        <ScrollRow items={items} />
      </div>
    </section>
  );
}

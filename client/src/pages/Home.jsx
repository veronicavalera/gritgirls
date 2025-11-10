// client/pages/Home.jsx
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="home" style={{ display: "grid", gap: 16 }}>
      {/* Hero */}
      <section className="card" style={{ padding: "28px 28px" }}>
        <div style={{ display: "grid", gap: 10 }}>
          <h1 style={{ margin: 0 }}>GritGirls</h1>
          <p style={{ fontSize: 18, margin: 0 }}>
            A community built by and for women in mountain biking — buy & sell used bikes, find riding partners,
            and post or RSVP to group rides.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            <Link to="/bikes"><button>Browse Bikes</button></Link>
            <Link to="/rides"><button>Find a Group Ride</button></Link>
            <Link to="/signup"><button style={{ background: "#111827" }}>Join the Community</button></Link>
          </div>
        </div>
      </section>

      {/* Why this matters */}
      <section className="card" style={{ padding: "22px 24px" }}>
        <h2 style={{ marginTop: 0 }}>Why GritGirls?</h2>
        <p style={{ marginBottom: 8 }}>
          Women are showing up on dirt in bigger numbers every year, yet finding other women to ride with — especially
          beyond beginner social spins — is still surprisingly hard. General marketplaces bury women’s bikes, and
          social groups can be fragmented or intimidating. GritGirls brings <strong>marketplace + directory + rides</strong>
          into one place so it’s easier to progress together.
        </p>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li><strong>Visibility:</strong> Surface quality used women’s bikes in one dedicated marketplace.</li>
          <li><strong>Connection:</strong> Lightweight profiles and a rider directory (zip/state) make it simple to meet up.</li>
          <li><strong>Momentum:</strong> Post rides by difficulty/terrain, RSVP in a click, and build consistent women’s crews.</li>
        </ul>
      </section>

      {/* Your story */}
      <section className="card" style={{ padding: "22px 24px" }}>
        <h2 style={{ marginTop: 0 }}>Built by a rider who wanted this, too</h2>
        <p style={{ marginBottom: 8 }}>
          I’m Veronica — a Princeton CS student, lifelong runner, and mountain-bike lover. I often found myself either
          riding solo or jumping in with my dad and his friends. I knew there were other women nearby at my level,
          but no easy way to find them. So I built GritGirls with a familiar tech stack (Python/Flask, SQLAlchemy, React)
          to solve the exact problems I ran into: discovering riders, organizing real rides, and making good gear more accessible.
        </p>
      </section>

      {/* How it works */}
      <section className="card" style={{ padding: "22px 24px" }}>
        <h2 style={{ marginTop: 0 }}>How it works</h2>
        <div className="grid-3" style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <Feature
            title="Women’s Bike Marketplace"
            body="List your bike with up to 3 photos. Buyers contact you directly; payments stay off-platform (Venmo/Zelle, etc.)."
          />
          <Feature
            title="Rider Directory"
            body="Opt-in profile with experience level and general location (state/ZIP prefix) to help the right riders find you."
          />
          <Feature
            title="Group Rides"
            body="Create rides with date/time, difficulty, terrain, and ZIP. Others RSVP, and the attendee count helps momentum build."
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <Link to="/signup"><button>Make a Profile</button></Link>
        </div>
      </section>

      {/* Education hub */}
      <section className="card" style={{ padding: "22px 24px" }}>
        <h2 style={{ marginTop: 0 }}>Learn & level up</h2>
        <p style={{ marginTop: 0 }}>
          A few curated resources to help you ride smarter, safer, and with more confidence:
        </p>

        <div className="grid-2" style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          <EduGroup
            heading="Skills & Techniques"
            links={[
              { href: "https://www.rei.com/learn/expert-advice/mountain-biking-techniques.html", text: "MTB Tips & Techniques (REI)" },
              { href: "https://www.liv-cycling.com/us/mountain-bike-skills-101", text: "MTB Skills 101 (Liv Cycling)" },
              { href: "https://www.liv-cycling.com/us/mountain-bike-skills-201", text: "MTB Skills 201 (Liv Cycling)" },
              { href: "https://www.rei.com/learn/c/mountain-biking/t/skills", text: "REI Skills Article Library" },
            ]}
          />
          <EduGroup
            heading="Maintenance & Setup"
            links={[
              { href: "https://www.parktool.com/en-us/blog/repair-help", text: "Park Tool: Repair Help Index" },
              { href: "https://www.rei.com/learn/expert-advice/mountain-biking-beginners.html", text: "MTB for Beginners (gear & prep)" },
              { href: "https://www.rei.com/learn/expert-advice/mountain-bike-fit.html", text: "Mountain Bike Sizing & Fit (REI)" },
            ]}
          />
          <EduGroup
            heading="Etiquette & Advocacy"
            links={[
              { href: "https://www.imba.com/sites/default/files/content/resources/2020-09/IMBA_Posters_RulesoftheTrail_final.pdf", text: "IMBA: Rules of the Trail (PDF)" },
              { href: "https://www.imba.com/resource-hub", text: "IMBA Resource Hub" },
              { href: "https://www.bicycling.com/skills-tips/a37613169/trail-etiquette/", text: "Trail Etiquette Tips (Bicycling)" },
            ]}
          />
          <EduGroup
            heading="Training & Progression"
            links={[
              { href: "https://www.rei.com/learn/expert-advice/how-to-train-for-mountain-biking.html", text: "How to Train for MTB (REI)" },
              { href: "https://www.imba.com/ride/for-women", text: "IMBA: For Women (events & ideas)" },
              { href: "https://www.pinkbike.com/news/tags/tutorials-and-guides/", text: "Pinkbike: Tutorials & Guides" },
            ]}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="card" style={{ padding: "22px 24px", textAlign: "center" }}>
        <h2 style={{ marginTop: 0 }}>Ready to roll?</h2>
        <p style={{ marginBottom: 12 }}>
          Post a bike, join a ride, or just say hi. The hardest part is finding each other — GritGirls makes that part easy.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/bikes"><button>List or Browse Bikes</button></Link>
          <Link to="/rides"><button>See Upcoming Rides</button></Link>
          <Link to="/signup"><button style={{ background: "#111827" }}>Create Your Profile</button></Link>
        </div>
      </section>
    </div>
  );
}

function Feature({ title, body }) {
  return (
    <div className="card" style={{ padding: "12px 14px" }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ color: "var(--muted)" }}>{body}</div>
    </div>
  );
}

function EduGroup({ heading, links }) {
  return (
    <div className="card" style={{ padding: "12px 14px" }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{heading}</div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {links.map((l, i) => (
          <li key={i}>
            <a href={l.href} target="_blank" rel="noreferrer">{l.text}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

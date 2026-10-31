
import { Construction } from 'lucide-react';

function PlaceholderPage({ title, description }) {
  return (
    <div className="placeholder-page">

      <div className="placeholder-icon">
        <Construction size={32} />
      </div>

      <h1>{title}</h1>

      <p>{description}</p>

      <span>
        Раздел находится в разработке.
      </span>

    </div>
  );
}

export default PlaceholderPage;

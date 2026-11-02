// src/components/HomepageDashboard.jsx
import React from 'react';
import './HomepageDashboard.css';

export const ACCOUNT_MANAGERS_DATA = [
  {
    id: 'kavita',
    name: 'KAVITA',
    role: 'Account Manager',
    avatar: 'K',
    accent: 'blue',
    categories: [
      {
        type: 'IKA',
        stores: ['AEON', 'AEON BIG', 'GIANT', 'PANDAMART', 'MYDIN', 'TF VALUE'],
      },
      {
        type: 'LKA',
        stores: [
          'ZEMART',
          'FAMILY STORE',
          'CS BROTHERS',
          'CB',
          'CLC',
          'CS GROCER',
          'STAR GROCER',
          'SOON CHEONG',
          'JIMART/DOREMART',
          'KC PLUS',
          'JAYA GROCER',
          'SUGO',
          'SUNSHINE WHOLESALE',
          'BINTANG FRESH'
        ],
      },
      {
        type: 'SKA',
        stores: [],
      },
    ],
  },
  {
    id: 'shakti',
    name: 'SHAKTI',
    role: 'Account Manager',
    avatar: 'S',
    accent: 'green',
    categories: [
      {
        type: 'IKA',
        stores: ['LOTUS', 'NSK', 'NSK GROCER', 'TMG'],
      },
      {
        type: 'LKA',
        stores: [
          'BSK',
          'GT MART',
          'PANTAI SELAMAT',
          'SABASUN',
          'JAYA GADING',
          'ECONJAYA',
          'PANTAI TIMOR',
          'SALAMKU',
          'FRESH CHOICE',
          'SARAWAK',
          'SRI TERNAK/ST ROSYAM',
          'AOMORI',
          'TY PASARAYA',
          'V SEGAR'
        ],
      },
      {
        type: 'DISTRIBUTOR',
        stores: ['TERANG TT', 'CKA'],
      },
    ],
  },
  {
    id: 'linda',
    name: 'LINDA',
    role: 'Account Manager',
    avatar: 'L',
    accent: 'amber',
    categories: [
      {
        type: 'IKA',
        stores: ['ECONSAVE', 'TFP (OTK, VG, TFM)', 'HERO'],
      },
      {
        type: 'LKA',
        stores: [
          'TARGET',
          'BIG 10',
          'HWA THAI',
          'MASLEE',
          'MERCEARIA',
          'MEMIZOOZOO',
          'HOCK MEI',
          'BILLION',
          'BORONG DIN',
          'PAK TORI',
          'LS MART',
          'C MART',
        ],
      },
    ],
  }
];

function HomepageDashboard() {
  return (
    <div className="homepage-dashboard">
      {/* <div className="homepage-header-banner">
        <div className="homepage-header-banner__left">
          <span className="homepage-header-banner__icon">👥</span>
          <div>
            <h2 className="homepage-header-banner__title">Account Managers</h2>
            <p className="homepage-header-banner__subtitle">
              Assigned Key Accounts (IKA, LKA, SKA & Distributors) Portfolio Overview
            </p>
          </div>
        </div>
        <div className="homepage-header-banner__badges">
          <span className="homepage-summary-pill">3 Account Managers</span>
          <span className="homepage-summary-pill homepage-summary-pill--accent">
            54 Key Store Groups
          </span>
        </div>
      </div> */}

      <div className="am-cards-grid">
        {ACCOUNT_MANAGERS_DATA.map((am) => {
          const totalStores = am.categories.reduce(
            (sum, cat) => sum + (cat.stores.length > 0 ? cat.stores.length : 1),
            0
          );

          return (
            <div key={am.id} className={`am-card am-card--${am.accent}`}>
              {/* Card Top Header */}
              <div className="am-card__header">
                <div className="am-card__identity">
                  <div className={`am-card__avatar am-card__avatar--${am.accent}`}>
                    {am.avatar}
                  </div>
                  <div>
                    <h3 className="am-card__name">{am.name}</h3>
                    <span className="am-card__role">{am.role}</span>
                  </div>
                </div>

                <div className="am-card__count-badge">
                  <span>{totalStores} Accounts</span>
                </div>
              </div>

              {/* Categories & Stores Body */}
              <div className="am-card__body">
  {am.categories.map((cat) => (
    <div key={cat.type} className="am-category-group">
      <div className="am-category-header">
        <span
          className={`am-category-badge am-category-badge--${cat.type.toLowerCase()}`}
        >
          {cat.type}
        </span>
        {/* {cat.stores.length > 0 && (
          <span className="am-category-count">
            {cat.stores.length} {cat.stores.length === 1 ? 'Store' : 'Stores'}
          </span>
        )} */}
      </div>

      {cat.stores.length > 0 ? (
        <div className="am-store-tags">
          {cat.stores.map((store) => (
            <span
              key={store}
              className={`am-store-chip am-store-chip--${cat.type.toLowerCase()}`}
            >
              {store}
            </span>
          ))}
        </div>
      ) : (
        <div className="am-store-tags">
          <span
            className={`am-store-chip am-store-chip--${cat.type.toLowerCase()}`}
          >
            All {cat.type} Outlets
          </span>
        </div>
      )}
    </div>
  ))}
</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default HomepageDashboard;

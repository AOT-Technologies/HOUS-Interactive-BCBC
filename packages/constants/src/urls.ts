/**
 * URL constants for navigation and external links
 */

export interface NavigationLink {
  title: string;
  href: string;
  target?: '_blank' | '_self';
}

// URL titles
export const URL_GLOSSARY_TITLE = 'Glossary';
export const URL_DOWNLOAD_TITLE = 'Download';

// URL paths
export const URL_HOME = '/';
export const URL_GLOSSARY = '/glossary';
export const URL_DOWNLOAD = '/download';

// Main navigation links (Header)
export const URLS_MAIN_NAVIGATION: NavigationLink[] = [
  {
    title: 'Glossary',
    href: '/glossary',
  },
  {
    title: 'Download',
    href: '/download',
  },
];

// Footer links
export const URLS_FOOTER: NavigationLink[] = [
  {
    title: 'Home',
    href: 'https://www2.gov.bc.ca',
    target: '_blank',
  },
  {
    title: 'About gov.bc.ca',
    href: 'https://www2.gov.bc.ca/gov/content/about-gov-bc-ca',
    target: '_blank',
  },
  {
    title: 'Disclaimer',
    href: 'https://www2.gov.bc.ca/gov/content/home/disclaimer',
    target: '_blank',
  },
  {
    title: 'Privacy',
    href: 'https://www2.gov.bc.ca/gov/content/home/privacy',
    target: '_blank',
  },
  {
    title: 'Accessibility',
    href: 'https://www2.gov.bc.ca/gov/content/home/accessible-government',
    target: '_blank',
  },
  {
    title: 'Copyright',
    href: 'https://www2.gov.bc.ca/gov/content/home/copyright',
    target: '_blank',
  },
  {
    title: 'Contact Us',
    href: 'https://www2.gov.bc.ca/gov/content/home/get-help-with-government-services',
    target: '_blank',
  },
];

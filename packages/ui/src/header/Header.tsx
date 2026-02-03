"use client";
// 3rd party
import {
  PropsWithChildren,
  ReactElement,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Image from "@repo/ui/image";
import { Dialog, Link as ReactAriaLink, Modal } from "react-aria-components";
// repo
import { URLS_MAIN_NAVIGATION } from "@repo/constants/src/urls";
import {
  ID_MAIN_NAVIGATION,
  ID_MAIN_NAVIGATION_MOBILE,
} from "@repo/constants/src/ids";
import {
  GET_TESTID_HEADER_NAV_ITEM,
  TESTID_HEADER,
  TESTID_HEADER_MOBILE_NAV,
  TESTID_HEADER_MOBILE_NAV_BUTTON,
} from "@repo/constants/src/testids";
// local
import Icon from "../icon/Icon";
import Link from "../link/Link";
import Button from "../button/Button";
import HeaderSearch from "../header-search/HeaderSearch";
import "./Header.css";

export interface HeaderProps {
  /**
   * Array of link elements that are not visible until they are focused. Used
   * for accessibility for keyboard users, to let them easily skip to main
   * content, navigation, etc.
   */
  skipLinks?: ReactElement[];
  /**
   * Header title text that appears to the right of the logo.
   */
  title?: string;
  /**
   * URL to the logo image. Won't render if not provided.
   */
  logoSrc?: string;
  /**
   * Desired element that renders the `title` string. Defaults to `<span>`.
   */
  titleElement?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span" | "p";
  /**
   * Callback when search is submitted. If provided, search bar will be shown.
   */
  onSearch?: (query: string) => void;
  /**
   * Function to fetch search suggestions for autocomplete.
   */
  getSuggestions?: (query: string) => Promise<string[]> | string[];
  /**
   * Placeholder text for search input.
   */
  searchPlaceholder?: string;
}

const getCloseButton = (
  setMobileNavIsOpen: () => void,
  mobileNavIsOpen: boolean,
) => {
  return (
    <Button
      id={ID_MAIN_NAVIGATION_MOBILE}
      aria-label={
        mobileNavIsOpen ? "Close the navigation" : "Open the navigation"
      }
      isIconButton
      variant="secondary"
      className="ui-Header--NavMobileToggle"
      onPress={() => setMobileNavIsOpen()}
      data-testid={TESTID_HEADER_MOBILE_NAV_BUTTON}
    >
      {mobileNavIsOpen ? <Icon type="close" /> : <Icon type="menu" />}
    </Button>
  );
};

const getNavList = (onLinkClick: (href: string) => void) => {
  return (
    <ul className="ui-Header--NavList">
      {URLS_MAIN_NAVIGATION.map(({ title, ...props }) => (
        <li key={title} className="ui-Header--NavListItem">
          <Link
            className="ui-Header--NavLink"
            data-testid={GET_TESTID_HEADER_NAV_ITEM(title)}
            onPress={
              props.target === "_blank"
                ? undefined
                : () => onLinkClick(props.href)
            }
            {...props}
          >
            {title}
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default function Header({
  skipLinks,
  title = "",
  titleElement = "h1",
  logoSrc,
  onSearch,
  getSuggestions,
  searchPlaceholder = "Search building code...",
}: PropsWithChildren<HeaderProps>) {
  // setup state
  const router = useRouter();
  const [mobileNavIsOpen, setMobileNavIsOpen] = useState(false);
  const onMobileNavLinkClick = (href: string) => {
    setMobileNavIsOpen(false);
    router.push(href);
  };

  useEffect(() => {
    if (mobileNavIsOpen) {
      // scroll page to top when main nav is opened on mobile
      // this is a weird case because the design shows the header when the main nav is open, but the nav isn't sticky
      // easiest solution is to scroll to top - rare use case
      window.scrollTo(0, 0);
    }
  }, [mobileNavIsOpen]);

  const onWindowResize = useCallback(() => {
    setMobileNavIsOpen(false);
  }, [setMobileNavIsOpen]);

  useEffect(() => {
    window.addEventListener("resize", onWindowResize);
    return () => {
      window.removeEventListener("resize", onWindowResize);
    };
  }, [onWindowResize]);

  function getTitle() {
    switch (titleElement) {
      case "h1":
        return <h1 className="ui-Header--Title">{title}</h1>;
      case "h2":
        return <h2 className="ui-Header--Title">{title}</h2>;
      case "h3":
        return <h3 className="ui-Header--Title">{title}</h3>;
      case "h4":
        return <h4 className="ui-Header--Title">{title}</h4>;
      case "h5":
        return <h5 className="ui-Header--Title">{title}</h5>;
      case "h6":
        return <h6 className="ui-Header--Title">{title}</h6>;
      case "p":
        return <p className="ui-Header--Title">{title}</p>;
      default:
        return <span className="ui-Header--Title">{title}</span>;
    }
  }

  return (
    <header
      className={`ui-Header ${mobileNavIsOpen ? "--mobile-open" : ""}`}
      data-testid={TESTID_HEADER}
    >
      <div className="u-container ui-Header--Container">
        {skipLinks && (
          <ul className="ui-Header--SkipLinks">
            {skipLinks.map((link, index) => {
              return <li key={`skipLink-${index}`}>{link}</li>;
            })}
          </ul>
        )}
        
        {/* Logo and Title Section */}
        <div className="ui-Header--LogoTitleSection">
          {logoSrc && (
            <ReactAriaLink href="/" className="ui-Header--LogoLink">
              <Image
                src={logoSrc}
                alt={"Government of British Columbia Logo - Go to the homepage"}
                width={"129"}
                height={"54"}
              />
            </ReactAriaLink>
          )}
          {title && (
            <div className="ui-Header--TitleWrapper">
              <div className="ui-Header--Line" />
              {getTitle()}
            </div>
          )}
        </div>

        {/* Header Content Section (Search + Nav) */}
        <div className="ui-Header--ContentSection">
          {onSearch && (
            <HeaderSearch
              onSearch={onSearch}
              getSuggestions={getSuggestions}
              placeholder={searchPlaceholder}
            />
          )}
          <nav className="ui-Header--Nav" id={ID_MAIN_NAVIGATION}>
            {getNavList(router.push)}
            {getCloseButton(() => setMobileNavIsOpen(true), mobileNavIsOpen)}
          </nav>
        </div>

        <Modal
          isDismissable
          isOpen={mobileNavIsOpen}
          onOpenChange={setMobileNavIsOpen}
          data-testid={TESTID_HEADER_MOBILE_NAV}
        >
          <Dialog className="ui-Header--NavMobileWrapper" aria-label={title}>
            <nav className="ui-Header--NavMobile">
              {getNavList(onMobileNavLinkClick)}
            </nav>
          </Dialog>
        </Modal>
      </div>
    </header>
  );
}

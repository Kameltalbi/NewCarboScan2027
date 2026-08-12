import React from "react";
import { Leaf, Twitter, Linkedin, Facebook, Instagram } from "lucide-react";
import { useTranslation } from "react-i18next";

export const NewFooter: React.FC = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  
  const footerSections = [
    {
      title: t("newHomepage.footer.sections.product.title"),
      links: [
        { name: t("newHomepage.footer.sections.product.links.freeTester"), href: "#tester" },
        { name: t("newHomepage.footer.sections.product.links.pricing"), href: "#pricing" },
        { name: t("newHomepage.footer.sections.product.links.integrations"), href: "#" }
      ]
    },
    {
      title: t("newHomepage.footer.sections.company.title"),
      links: [
        { name: t("newHomepage.footer.sections.company.links.about"), href: "/about" },
        { name: t("newHomepage.footer.sections.company.links.blog"), href: "/blog" }
      ]
    },
    {
      title: t("newHomepage.footer.sections.support.title"),
      links: [
        { name: t("newHomepage.footer.sections.support.links.helpCenter"), href: "/faq" },
        { name: t("newHomepage.footer.sections.support.links.contact"), href: "/contact" },
        { name: t("newHomepage.footer.sections.support.links.training"), href: "/formation-bilan-carbone" }
      ]
    },
    {
      title: t("newHomepage.footer.sections.legal.title"),
      links: [
        { name: t("newHomepage.footer.sections.legal.links.legalMentions"), href: "/legal-mentions" },
        { name: t("newHomepage.footer.sections.legal.links.privacy"), href: "/privacy-policy" },
        { name: t("newHomepage.footer.sections.legal.links.terms"), href: "/cgv" },
        { name: t("newHomepage.footer.sections.legal.links.cookies"), href: "#" },
        { name: t("newHomepage.footer.sections.legal.links.gdpr"), href: "#" }
      ]
    }
  ];

  const socialLinks = [
    { name: "Twitter", icon: Twitter, href: "#" },
    { name: "LinkedIn", icon: Linkedin, href: "https://www.linkedin.com/company/108125482/" },
    { name: "Facebook", icon: Facebook, href: "https://www.facebook.com/p/CarboScan-61581484901115/" },
    { name: "Instagram", icon: Instagram, href: "#" }
  ];

  return (
    <footer className="bg-[#0F172A] text-white py-20">
      <div className="container mx-auto px-6">
        {/* Footer Content */}
        <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-6 gap-4 md:gap-10 mb-12">
          {/* Company Info */}
          <div className="col-span-3 md:col-span-2 lg:col-span-2 mb-6 md:mb-0">
            <div className="flex items-center gap-3 text-2xl font-bold text-[#1ABC9C] mb-4">
              <img 
                src="/logos/logo-carboscan-blanc.png?v=3"
                alt="CarboScan - Bilan Carbone"
                className="h-12 w-auto"
              />
            </div>
            <p className="text-gray-400 leading-relaxed mb-5 max-w-md text-sm md:text-base">
              {t("newHomepage.footer.tagline")}
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  target={social.href.startsWith("http") ? "_blank" : undefined}
                  rel={social.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="w-10 h-10 bg-[#1ABC9C]/10 rounded-full flex items-center justify-center text-[#1ABC9C] transition-all duration-300 hover:bg-[#1ABC9C] hover:text-white hover:-translate-y-1"
                  aria-label={social.name}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Footer Sections - Mobile: 3 colonnes, Desktop: comme avant */}
          {footerSections.map((section, index) => (
            <div key={index} className="col-span-1">
              <h4 className="text-xs md:text-lg font-semibold text-white mb-2 md:mb-5">
                {section.title}
              </h4>
              <ul className="space-y-1.5 md:space-y-3">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a
                      href={link.href}
                      className="text-xs md:text-base text-gray-400 transition-colors duration-300 hover:text-[#1ABC9C]"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-gray-700 pt-5">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-center md:text-left">
              {t("newHomepage.footer.bottom.copyright", { year: currentYear })}
            </p>
            <div className="flex gap-6">
              <a href="/legal-mentions" className="text-gray-400 hover:text-[#1ABC9C] transition-colors">
                {t("newHomepage.footer.bottom.links.legal")}
              </a>
              <a href="/privacy-policy" className="text-gray-400 hover:text-[#1ABC9C] transition-colors">
                {t("newHomepage.footer.bottom.links.privacy")}
              </a>
              <a href="/cgv" className="text-gray-400 hover:text-[#1ABC9C] transition-colors">
                {t("newHomepage.footer.bottom.links.terms")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
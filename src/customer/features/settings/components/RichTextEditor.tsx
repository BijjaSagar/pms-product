import { Editor } from '@tinymce/tinymce-react';
// TinyMCE is bundled here instead of loaded from a CDN, so it needs no account or API key and works offline.
import 'tinymce/tinymce';
import 'tinymce/models/dom/model';
import 'tinymce/themes/silver';
import 'tinymce/icons/default';
import 'tinymce/skins/ui/oxide/skin.css';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/link';
import 'tinymce/plugins/autolink';
import contentUiCss from 'tinymce/skins/ui/oxide/content.css?inline';
import contentCss from 'tinymce/skins/content/default/content.css?inline';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  /** Names the editor for screen readers. */
  label: string;
}

/** What the data layer keeps (see `sanitizeRichText`): the editor offers nothing beyond it. */
const TOOLBAR = 'undo redo | blocks | bold italic underline strikethrough | bullist numlist | link | removeformat';

/** A small rich text editor for the property's terms and inclusions; its value is HTML. */
export function RichTextEditor({ value, onChange, disabled, label }: RichTextEditorProps) {
  return (
    <Editor
      licenseKey="gpl"
      value={value}
      disabled={disabled}
      onEditorChange={onChange}
      init={{
        // The skin and content styles are imported above, so TinyMCE must not fetch its own.
        skin: false,
        content_css: false,
        content_style: `@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&display=swap');
${contentUiCss.toString()}\n${contentCss.toString()}\nbody { font-family: Manrope, system-ui, sans-serif; font-size: 14px; line-height: 1.55; }`,
        height: 280,
        menubar: false,
        statusbar: false,
        branding: false,
        promotion: false,
        plugins: ['lists', 'link', 'autolink'],
        toolbar: TOOLBAR,
        block_formats: 'Paragraph=p; Heading=h3; Subheading=h4; Quote=blockquote',
        // Only the formatting the data layer keeps, so what is shown while editing is what is saved.
        valid_elements:
          'p,br,strong/b,em/i,u,s,ul,ol,li,a[href|title|rel],h2,h3,h4,blockquote,hr',
        link_default_protocol: 'https',
        link_title: false,
        target_list: false,
        paste_data_images: false,
        convert_urls: false,
        browser_spellcheck: true,
        a11y_advanced_options: false,
        setup: (editor) => {
          editor.on('init', () => editor.getBody().setAttribute('aria-label', label));
        },
      }}
    />
  );
}

// src/library/utils.test.ts
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { cn, parseAndStyleTaskText, parseTextForInlineStyling } from './utils';
import React from 'react'; // Make sure React is imported for JSX

describe('cn', () => {
    it('should merge Tailwind classes correctly, resolving conflicts', () => {
        const class1 = 'text-red-500';
        const class2 = 'bg-blue-200';
        const class3 = 'p-4';
        const conditionalClass = true && 'font-bold';
        const overrideClass = 'text-green-700';
        const anotherClass = 'flex';
        const result = cn(class1, class2, class3, conditionalClass, overrideClass, anotherClass);
        expect(result).toBe('bg-blue-200 p-4 font-bold flex text-green-700');
    });

    it('should handle empty, null, and undefined inputs gracefully', () => {
        const empty1 = '';
        const empty2 = null;
        const empty3 = undefined;
        const result = cn(empty1, empty2, empty3);
        expect(result).toBe('');
    });

    it('should handle mixed array and string inputs', () => {
        const mixedInput = ['flex', { 'items-center': true }, 'justify-between'];
        const result = cn('container', mixedInput, 'mx-auto');
        expect(result).toBe('container flex items-center justify-between mx-auto');
    });
});

describe('parseAndStyleTaskText', () => {
    it('should parse and style mentions correctly with globe icon and classes', () => {
        const text = 'Hello @JohnDoe, how are you?';
        const { nodes, segments } = parseAndStyleTaskText(text);
        expect(segments).toEqual([
            { type: 'text', value: 'Hello ' },
            { type: 'mention', value: '@JohnDoe' },
            { type: 'text', value: ', how are you?' },
        ]);
        const { container } = render(<div>{ nodes } </div>);
        const mentionSpan = screen.getByText('JohnDoe');
        expect(mentionSpan).toBeInTheDocument();
        expect(mentionSpan).toHaveClass('bg-tag-mention-bg');
        expect(mentionSpan?.querySelector('svg.h-3.w-3')).toBeInTheDocument();
    });

    it('should parse and style hashtags correctly with globe icon and classes', () => {
        const text = 'This is a #test and another #feature.';
        const { nodes, segments } = parseAndStyleTaskText(text);
        expect(segments).toEqual([
            { type: 'text', value: 'This is a ' },
            { type: 'hashtag', value: '#test' },
            { type: 'text', value: ' and another ' },
            { type: 'hashtag', value: '#feature' },
            { type: 'text', value: '.' },
        ]);
        const { getAllByText } = render(<div>{ nodes } </div>);
        const testHashtag = getAllByText('test')[0];
        expect(testHashtag).toHaveClass('bg-tag-hashtag-bg');
        expect(testHashtag?.querySelector('svg.h-3.w-3')).toBeInTheDocument();
        const featureHashtag = getAllByText('feature')[0];
        expect(featureHashtag).toHaveClass('bg-tag-hashtag-bg');
        expect(featureHashtag?.querySelector('svg.h-3.w-3')).toBeInTheDocument();
    });

    it('should parse and style email addresses correctly as clickable globes', () => {
        const text = 'Contact me at user@example.com for details.';
        const { nodes, segments } = parseAndStyleTaskText(text);
        expect(segments).toEqual([
            { type: 'text', value: 'Contact me at ' },
            { type: 'email', value: 'user@example.com' },
            { type: 'text', value: ' for details.' },
        ]);
        const { getByText } = render(<div>{ nodes } </div>);
        const emailTag = getByText('user@example.com');
        expect(emailTag).toBeInTheDocument();
        expect(emailTag).toHaveClass('bg-tag-email-bg');
        expect(emailTag.closest('a')).toHaveAttribute('href', 'mailto:user@example.com');
        expect(emailTag?.querySelector('svg.h-3.w-3')).toBeInTheDocument();
    });

    it('should parse and style links correctly as clickable globes', () => {
        const text = 'Visit our site: https://www.example.com and also www.google.com.';
        const { nodes, segments } = parseAndStyleTaskText(text);
        expect(segments).toEqual([
            { type: 'text', value: 'Visit our site: ' },
            { type: 'link', value: 'https://www.example.com' },
            { type: 'text', value: ' and also ' },
            { type: 'link', value: 'www.google.com' },
            { type: 'text', value: '.' },
        ]);
        const { getByText } = render(<div>{ nodes } </div>);
        const link1 = getByText('https://www.example.com');
        expect(link1).toBeInTheDocument();
        expect(link1).toHaveClass('bg-tag-link-bg');
        expect(link1.closest('a')).toHaveAttribute('href', 'https://www.example.com');
        expect(link1?.querySelector('svg.h-3.w-3')).toBeInTheDocument();
        const link2 = screen.getByText('www.google.com');
        expect(link2).toBeInTheDocument();
        expect(link2).toHaveClass('bg-tag-link-bg');
        expect(link2.closest('a')).toHaveAttribute('href', 'http://www.google.com');
        expect(link2?.querySelector('svg.h-3.w-3')).toBeInTheDocument();
    });

    it('should handle a mix of different tags and plain text', () => {
        const text = 'Check out @user1, #project, contact support@company.com, and visit example.org.';
        const { nodes, segments } = parseAndStyleTaskText(text);
        expect(segments).toEqual([
            { type: 'text', value: 'Check out ' },
            { type: 'mention', value: '@user1' },
            { type: 'text', value: ', ' },
            { type: 'hashtag', value: '#project' },
            { type: 'text', value: ', contact ' },
            { type: 'email', value: 'support@company.com' },
            { type: 'text', value: ', and visit ' },
            { type: 'link', value: 'example.org' },
            { type: 'text', value: '.' },
        ]);
        const { container } = render(<div>{ nodes } </div>);
        expect(container.querySelectorAll('.bg-tag-mention-bg').length).toBe(1);
        expect(container.querySelectorAll('.bg-tag-hashtag-bg').length).toBe(1);
        expect(container.querySelectorAll('.bg-tag-email-bg').length).toBe(1);
        expect(container.querySelectorAll('.bg-tag-link-bg').length).toBe(1);
    });

    it('should render plain text without any special styling', () => {
        const text = 'Just plain text without any special tags.';
        const { nodes, segments } = parseAndStyleTaskText(text);
        expect(segments).toEqual([{ type: 'text', value: text }]);
        const { container } = render(<div>{ nodes } </div>);
        expect(container).toHaveTextContent(text);
        expect(container.innerHTML).not.toContain('class="');
    });

    it('should correctly handle tags at the beginning and end of the text', () => {
        const text = '@startTask #endTag';
        const { nodes, segments } = parseAndStyleTaskText(text);
        expect(segments).toEqual([
            { type: 'mention', value: '@startTask' },
            { type: 'text', value: ' ' },
            { type: 'hashtag', value: '#endTag' },
        ]);
        const { container } = render(<div>{ nodes } </div>);
        expect(screen.getByText('startTask')).toBeInTheDocument();
        expect(screen.getByText('endTag')).toBeInTheDocument();
    });

    it('should apply hover classes to the rendered tag globes', () => {
        const text = '@user #tag email@example.com https://link.com';
        const { nodes } = parseAndStyleTaskText(text);
        render(<div>{ nodes } </div>);
        const mention = screen.getByText('user');
        expect(mention).toHaveClass('hover:bg-tag-mention-hover-bg');
        const hashtag = screen.getByText('tag');
        expect(hashtag).toHaveClass('hover:bg-tag-hashtag-hover-bg');
        const email = screen.getByText('email@example.com');
        expect(email).toHaveClass('hover:bg-tag-email-hover-bg');
        const link = screen.getByText('https://link.com');
        expect(link).toHaveClass('hover:bg-tag-link-hover-bg');
    });

    it('should prevent default on tag globe click to avoid parent events', async () => {
        const handleClick = vi.fn();
        const { nodes } = parseAndStyleTaskText('@mention');
        render(<div onClick={ handleClick } > { nodes } </div>);
        const mentionSpan = screen.getByText('mention');
        await userEvent.click(mentionSpan);
        expect(handleClick).not.toHaveBeenCalled();
    });
});

describe('parseTextForInlineStyling', () => {
    it('should style mentions with text-tag-mention-text and font-semibold for inline coloring', () => {
        const text = 'This is for @user.';
        const nodes = parseTextForInlineStyling(text);
        render(<div>{ nodes } </div>);
        const mentionSpan = screen.getByText('@user');
        expect(mentionSpan).toBeInTheDocument();
        expect(mentionSpan).toHaveClass('text-tag-mention-text', 'font-semibold');
        expect(mentionSpan).toHaveTextContent('@user');
    });

    it('should style hashtags with text-tag-hashtag-text and font-semibold for inline coloring', () => {
        const text = 'Using #tailwindCSS for styling.';
        const nodes = parseTextForInlineStyling(text);
        render(<div>{ nodes } </div>);
        const hashtagSpan = screen.getByText('#tailwindCSS');
        expect(hashtagSpan).toBeInTheDocument();
        expect(hashtagSpan).toHaveClass('text-tag-hashtag-text', 'font-semibold');
        expect(hashtagSpan).toHaveTextContent('#tailwindCSS');
    });

    it('should style email addresses with text-tag-email-text and font-semibold for inline coloring', () => {
        const text = 'Send it to contact@example.com.';
        const nodes = parseTextForInlineStyling(text);
        render(<div>{ nodes } </div>);
        const emailSpan = screen.getByText('contact@example.com');
        expect(emailSpan).toBeInTheDocument();
        expect(emailSpan).toHaveClass('text-tag-email-text', 'font-semibold');
        expect(emailSpan).toHaveTextContent('contact@example.com');
    });

    it('should style links with text-tag-link-text and font-semibold for inline coloring', () => {
        const text = 'More info at https://my-blog.dev.';
        const nodes = parseTextForInlineStyling(text);
        render(<div>{ nodes } </div>);
        const linkSpan = screen.getByText('https://my-blog.dev');
        expect(linkSpan).toBeInTheDocument();
        expect(linkSpan).toHaveClass('text-tag-link-text', 'font-semibold');
        expect(linkSpan).toHaveTextContent('https://my-blog.dev');
    });

    it('should correctly handle text with no special tags, returning plain text', () => {
        const text = 'This is just a regular sentence.';
        const nodes = parseTextForInlineStyling(text);
        render(<div>{ nodes } </div>);
        expect(screen.getByText(text)).toBeInTheDocument();
        expect(screen.queryByText(text)?.tagName).toBe('DIV'); // Check parent tag, not span.
    });

    it('should handle a combination of tags and plain text correctly', () => {
        const text = 'Meeting with @Alice for #design at alice@email.com, check https://zoom.us.';
        const nodes = parseTextForInlineStyling(text);
        render(<div>{ nodes } </div>);
        expect(screen.getByText('@Alice')).toHaveClass('text-tag-mention-text', 'font-semibold');
        expect(screen.getByText('#design')).toHaveClass('text-tag-hashtag-text', 'font-semibold');
        expect(screen.getByText('alice@email.com')).toHaveClass('text-tag-email-text', 'font-semibold');
        expect(screen.getByText('https://zoom.us')).toHaveClass('text-tag-link-text', 'font-semibold');
        expect(screen.getByText('Meeting with @Alice for #design at alice@email.com, check https://zoom.us.')).toBeInTheDocument();
    });
});
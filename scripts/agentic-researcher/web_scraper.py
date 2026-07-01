#!/usr/bin/env python3
"""
Simple web scraper for researching city climate leaders and movements.
"""

import urllib.request
import urllib.parse
import time
import re
from typing import Dict, List, Optional
from html.parser import HTMLParser

# Try to import ddgs, fall back to manual scraping
try:
    from ddgs import DDGS
    HAS_DDGS = True
except ImportError:
    HAS_DDGS = False


class HTMLToText(HTMLParser):
    """Convert HTML to plain text, skipping unwanted tags."""
    
    def __init__(self):
        super().__init__()
        self.text = []
        self.skip = False
        self.skip_tags = {'script', 'style', 'nav', 'footer', 'header'}
    
    def handle_starttag(self, tag, attrs):
        if tag in self.skip_tags:
            self.skip = True
    
    def handle_endtag(self, tag):
        if tag in self.skip_tags:
            self.skip = False
    
    def handle_data(self, data):
        if not self.skip:
            text = data.strip()
            if text:
                self.text.append(text)
    
    def get_text(self):
        return ' '.join(self.text)


class WebScraper:
    """Simple web scraper using HTTP requests."""
    
    def __init__(self, user_agent: str = "Mozilla/5.0"):
        self.user_agent = user_agent
        self.headers = {'User-Agent': user_agent}
    
    def search(self, query: str, num_results: int = 3) -> Dict:
        """
        Search the web and return results.
        Uses duckduckgo-search library if available, otherwise manual scraping.
        Returns dict with 'snippet' (summary of results) and 'results' (list of {title, url, snippet}).
        """
        results = []
        
        # Use DDGS library if available (more reliable)
        if HAS_DDGS:
            try:
                with DDGS() as ddgs:
                    search_results = list(ddgs.text(query, max_results=num_results))
                    
                    for r in search_results:
                        results.append({
                            'title': r.get('title', ''),
                            'url': r.get('href', ''),
                            'snippet': r.get('body', '')
                        })
                    
                    # Create a combined snippet
                    combined_snippet = ' | '.join([r['snippet'] for r in results[:3]])
                    
                    return {
                        'snippet': combined_snippet,
                        'results': results
                    }
            except Exception as e:
                print(f"  DDGS search error for '{query}': {e}")
                # Fall back to manual scraping
        
        # Fallback: manual DuckDuckGo HTML scraping
        return self._manual_search(query, num_results)
    
    def _manual_search(self, query: str, num_results: int) -> Dict:
        """Manual DuckDuckGo HTML scraping (fallback method)."""
        results = []
        
        try:
            # Use DuckDuckGo HTML search
            encoded_query = urllib.parse.quote(query)
            url = f"https://html.duckduckgo.com/html/?q={encoded_query}"
            
            req = urllib.request.Request(url, headers=self.headers)
            with urllib.request.urlopen(req, timeout=10) as response:
                html = response.read().decode('utf-8')
            
            # Parse search results
            # DuckDuckGo HTML has result links with class 'result__a' and snippets with 'result__snippet'
            result_pattern = re.compile(
                r'<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)</a>.*?'
                r'<a[^>]*class="result__snippet"[^>]*>(.*?)</a>',
                re.DOTALL
            )
            
            for match in result_pattern.finditer(html):
                if len(results) >= num_results:
                    break
                
                url = match.group(1)
                title_html = match.group(2)
                snippet_html = match.group(3)
                
                # Clean HTML tags
                text_converter = HTMLToText()
                text_converter.feed(title_html)
                title = text_converter.get_text()
                
                text_converter = HTMLToText()
                text_converter.feed(snippet_html)
                snippet = text_converter.get_text()
                
                # Decode URL (DuckDuckGo uses redirect URLs)
                if 'uddg=' in url:
                    url = urllib.parse.unquote(url.split('uddg=')[1].split('&')[0])
                
                if title and snippet and url:
                    results.append({
                        'title': title,
                        'url': url,
                        'snippet': snippet
                    })
            
            # Create a combined snippet
            combined_snippet = ' | '.join([r['snippet'] for r in results[:3]])
            
            return {
                'snippet': combined_snippet,
                'results': results
            }
        
        except Exception as e:
            print(f"  Search error for '{query}': {e}")
            return {'snippet': '', 'results': []}
    
    def fetch_page(self, url: str, max_length: int = 5000) -> str:
        """Fetch and extract text from a webpage."""
        try:
            req = urllib.request.Request(url, headers=self.headers)
            with urllib.request.urlopen(req, timeout=10) as response:
                html = response.read().decode('utf-8')
            
            converter = HTMLToText()
            converter.feed(html)
            text = converter.get_text()
            
            # Truncate to max_length
            if len(text) > max_length:
                text = text[:max_length] + "..."
            
            return text
        
        except Exception as e:
            return f"Error fetching {url}: {e}"


# Global instance
web_scraper = WebScraper()

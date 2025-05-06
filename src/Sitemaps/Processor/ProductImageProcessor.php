<?php

namespace App\Sitemaps\Processor;

use Pimcore\Model\Element\ElementInterface;
use Pimcore\Bundle\SeoBundle\Sitemap\Element\GeneratorContextInterface;
use Pimcore\Bundle\SeoBundle\Sitemap\Element\ProcessorInterface;
use Pimcore\Model\DataObject\Product;
use Pimcore\Tool;
use Presta\SitemapBundle\Sitemap\Url\Url;
use Presta\SitemapBundle\Sitemap\Url\UrlConcrete;
use Presta\SitemapBundle\Sitemap\Url as Sitemap;
class ProductImageProcessor implements ProcessorInterface
{
    public function __construct(
        private string $siteProtocol
    )
    {

    }
    public function process(Url $url, ElementInterface $element, GeneratorContextInterface $context): Url
    {
        if (!$element instanceof Product || empty($image = $element->getImage())){
            return $url;
        }

        $imageUrl = Tool::getHostUrl($this->siteProtocol) . $image->getRealFullPath();

        $decoratedUrl = new Sitemap\GoogleImageUrlDecorator($url);
        $decoratedUrl->addImage(new Sitemap\GoogleImage($imageUrl));

        return $decoratedUrl;


    }
}

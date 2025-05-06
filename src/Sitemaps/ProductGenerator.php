<?php
namespace App\Sitemaps;

use Pimcore\Model\DataObject\Product;
use Pimcore\Bundle\SeoBundle\Sitemap\Element\AbstractElementGenerator;
use Pimcore\Bundle\SeoBundle\Sitemap\Element\GeneratorContext;
use Presta\SitemapBundle\Service\UrlContainerInterface;
use Presta\SitemapBundle\Sitemap\Url\UrlConcrete;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Routing\RouterInterface;

class ProductGenerator extends AbstractElementGenerator
{
    public function __construct(
        private readonly RouterInterface $router,
        iterable $filters =[],
        iterable $processors =[]
    ) {
        parent::__construct($filters, $processors);
    }

    public function populate(UrlContainerInterface $urlContainer, ?string $section = null): void
    {
        if ($section !== null && $section !== 'products') {
            return;
        }

        $products = new Product\Listing();

        $context = new GeneratorContext($urlContainer, 'products');

        foreach ($products as $product) {
            if (!$this->canBeAdded($product, $context)) {
                continue;
            }

            $url = $this->router->generate('shop-detail', [
                'slug' => $product->getSlug() ?? 'product',
                'productId' => $product->getId(),
            ], UrlGeneratorInterface::ABSOLUTE_URL);

            $sitemapEntry = new UrlConcrete($url, new \DateTimeImmutable());

            $processed = $this->process($sitemapEntry, $product, $context);
            if ($processed !== null) {
                $urlContainer->addUrl($processed, 'products');
            }
        }
    }
}


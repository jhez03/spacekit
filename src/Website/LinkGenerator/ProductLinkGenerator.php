<?php

namespace App\Website\LinkGenerator;

use Pimcore\Model\DataObject;
use Pimcore\Model\DataObject\ClassDefinition\LinkGeneratorInterface;
use Pimcore\Model\DataObject\Product;
use Pimcore\Twig\Extension\Templating\PimcoreUrl;
use Symfony\Component\String\Slugger\SluggerInterface;

class ProductLinkGenerator implements LinkGeneratorInterface
{
    public function __construct(
        private PimcoreUrl $pimcoreUrl,
        private SluggerInterface $slugger
    )
    {

    }

    public function generate(object $object, array $params = []): string {

        if (!($object instanceof Product)) {
            throw new \InvalidArgumentException('Given object is not a product');
        }


        return $this->doGenerate($object, $params);

    }
    protected function doGenerate(DataObject $object, array $params): string
    {
        return DataObject\Service::useInheritedValues(true, function () use ($object, $params) {
            if (!$object instanceof Product) {
                throw new \InvalidArgumentException('Given Object is not a Product');
            }

            $slug = $this->slugger->slug($object->getName());
            return $this->pimcoreUrl->__invoke(
                [
                    'slug' => $slug,
                    'productId' => $object->getId(),
                ],
                'shop-detail',
                true
            );
        });
    }

}
